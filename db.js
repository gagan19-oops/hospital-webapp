require("dotenv").config();
const fs = require("fs");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

// A single shared connection pool for the whole app.
//
// rowsAsArray:true makes every query return plain arrays (row[0], row[1], ...)
// in column order, instead of objects - this mirrors how the original Flask
// app used sqlite3 row tuples (row[0], row[1], ...) so the EJS templates
// ported from Jinja2 could stay almost line-for-line identical.
const poolConfig = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "hospital_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  rowsAsArray: true,
};

// Managed MySQL hosts (Aiven, PlanetScale, most cloud providers) require an
// encrypted connection. Local XAMPP/MySQL doesn't need this, so it's opt-in
// via .env - leave DB_SSL unset for local development.
if (process.env.DB_SSL === "true") {
  poolConfig.ssl = process.env.DB_SSL_CA_PATH
    ? { ca: fs.readFileSync(process.env.DB_SSL_CA_PATH) }
    : { rejectUnauthorized: false }; // works without a CA file, but skips cert validation
}

const pool = mysql.createPool(poolConfig);

// Creates all tables if they don't already exist, and seeds default staff
// accounts + a starter medicine catalog the first time the app runs.
// Equivalent to the init_db() function in the original app.py, extended for
// payments, real (DB-backed) staff logins, admin-managed patients, a
// pharmacy-owned medicine catalog, and multi-medicine requests.
async function initDb() {
  // NOTE: this CREATE TABLE (no medicine/quantity/cost columns - those now
  // live in request_items) only applies to brand new installs. If you're
  // upgrading an existing database that already has the old flat requests
  // table, run db/migrate_v4.sql once instead - see README.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      patient_id VARCHAR(50),
      ward VARCHAR(50),
      request_time VARCHAR(50),
      qr_status VARCHAR(50) DEFAULT 'Pending',
      qr_time VARCHAR(50),
      delivery_status VARCHAR(50) DEFAULT 'Pending',
      delivery_time VARCHAR(50),
      qr_data LONGTEXT,
      payment_status VARCHAR(20) DEFAULT 'Unpaid',
      payment_time VARCHAR(50),
      diagnosis VARCHAR(255),
      instructions VARCHAR(500)
    )
  `);

  // Adds the payment + clinical-context columns for anyone who set the DB up
  // before those features existed. Wrapped in try/catch since older MySQL
  // (<8.0.29) doesn't support "ADD COLUMN IF NOT EXISTS" and would throw if
  // the column is already there.
  //
  // diagnosis/instructions are filled in by the prescribing doctor/nurse at
  // request time (never invented by the chatbot) - see rag.js. This is what
  // lets the patient chatbot answer "why was this prescribed" / "when do I
  // take it" using real clinical input instead of guessing.
  for (const stmt of [
    "ALTER TABLE requests ADD COLUMN payment_status VARCHAR(20) DEFAULT 'Unpaid'",
    "ALTER TABLE requests ADD COLUMN payment_time VARCHAR(50)",
    "ALTER TABLE requests ADD COLUMN diagnosis VARCHAR(255)",
    "ALTER TABLE requests ADD COLUMN instructions VARCHAR(500)",
  ]) {
    try {
      await pool.query(stmt);
    } catch (err) {
      if (err.code !== "ER_DUP_FIELDNAME") throw err;
    }
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS patients (
      id INT AUTO_INCREMENT PRIMARY KEY,
      patient_id VARCHAR(50) NOT NULL UNIQUE,
      name VARCHAR(150) NOT NULL,
      created_at VARCHAR(50)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS medicines (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL UNIQUE,
      form VARCHAR(50) NOT NULL,
      unit VARCHAR(30) NOT NULL,
      created_at VARCHAR(50)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS request_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      request_id INT NOT NULL,
      medicine_name VARCHAR(150) NOT NULL,
      unit VARCHAR(30),
      quantity DECIMAL(10,2) NOT NULL,
      cost DECIMAL(10,2),
      FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL
    )
  `);

  // Consultation requests submitted from the homepage's "Book a Free
  // Consultation" form - just a name + phone number for the admin to follow
  // up on, no login required to submit one.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS consultations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      phone VARCHAR(30) NOT NULL,
      status VARCHAR(20) DEFAULT 'New',
      created_at VARCHAR(50)
    )
  `);

  // Note: the pool is configured with rowsAsArray:true, so `rows` here is
  // [[count]] (array of arrays) rather than [{count: ...}] (objects).
  const [userRows] = await pool.query("SELECT COUNT(*) FROM users");
  const userCount = userRows[0][0];
  if (userCount === 0) {
    const defaults = [
      { username: "admin", password: "admin123", role: "admin" },
      { username: "nurse", password: "nurse123", role: "nurse" },
      { username: "pharmacy", password: "pharm123", role: "pharmacy" },
    ];
    for (const u of defaults) {
      const hash = await bcrypt.hash(u.password, 10);
      await pool.query("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)", [
        u.username,
        hash,
        u.role,
      ]);
    }
    console.log("Seeded default staff accounts (admin/nurse/pharmacy).");
  }

  const [medRows] = await pool.query("SELECT COUNT(*) FROM medicines");
  const medCount = medRows[0][0];
  if (medCount === 0) {
    // A generic common-medicines starter list (not Siddaganga Hospital's
    // actual formulary - the hospital's pharmacy team should review, edit,
    // and add/remove entries from the Pharmacy Panel's Medicine Catalog to
    // match what they actually stock).
    const starterMedicines = [
      { name: "Paracetamol", form: "Tablet", unit: "mg" },
      { name: "Ibuprofen", form: "Tablet", unit: "mg" },
      { name: "Aspirin", form: "Tablet", unit: "mg" },
      { name: "Amoxicillin", form: "Capsule", unit: "mg" },
      { name: "Azithromycin", form: "Tablet", unit: "mg" },
      { name: "Ciprofloxacin", form: "Tablet", unit: "mg" },
      { name: "Metronidazole", form: "Tablet", unit: "mg" },
      { name: "Cough Syrup", form: "Syrup/Liquid", unit: "ml" },
      { name: "Cetirizine", form: "Tablet", unit: "mg" },
      { name: "Omeprazole", form: "Capsule", unit: "mg" },
      { name: "Pantoprazole", form: "Tablet", unit: "mg" },
      { name: "ORS", form: "Other", unit: "sachet(s)" },
      { name: "Metformin", form: "Tablet", unit: "mg" },
      { name: "Insulin", form: "Injection", unit: "ml" },
      { name: "Amlodipine", form: "Tablet", unit: "mg" },
      { name: "Atenolol", form: "Tablet", unit: "mg" },
      { name: "Losartan", form: "Tablet", unit: "mg" },
      { name: "Atorvastatin", form: "Tablet", unit: "mg" },
      { name: "Normal Saline IV", form: "Injection", unit: "ml" },
      { name: "Dextrose IV", form: "Injection", unit: "ml" },
      { name: "Diclofenac Gel", form: "Ointment", unit: "application(s)" },
      { name: "Antiseptic Ointment", form: "Ointment", unit: "application(s)" },
      { name: "Vitamin B Complex", form: "Tablet", unit: "tablet(s)" },
      { name: "Vitamin C", form: "Tablet", unit: "mg" },
      { name: "Iron + Folic Acid", form: "Tablet", unit: "tablet(s)" },
      { name: "Calcium + Vitamin D3", form: "Tablet", unit: "tablet(s)" },
      { name: "Salbutamol Inhaler", form: "Other", unit: "dose(s)" },
      { name: "Multivitamin Syrup", form: "Syrup/Liquid", unit: "ml" },
      { name: "Diazepam", form: "Tablet", unit: "mg" },
      { name: "Ranitidine", form: "Tablet", unit: "mg" },
    ];
    for (const m of starterMedicines) {
      await pool.query("INSERT INTO medicines (name, form, unit, created_at) VALUES (?, ?, ?, ?)", [
        m.name,
        m.form,
        m.unit,
        formatNow(),
      ]);
    }
    console.log("Seeded a starter medicine catalog.");
  }
}

// Matches the "%d-%m-%Y %I:%M %p" format used throughout the app (e.g.
// "11-07-2026 03:45 PM"), so timestamps look consistent everywhere.
function formatNow() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  let hours = now.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()} ${pad(hours)}:${pad(
    now.getMinutes()
  )} ${ampm}`;
}

module.exports = { pool, initDb };
