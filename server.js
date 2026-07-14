require("dotenv").config();
const express = require("express");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const path = require("path");
const fs = require("fs");
const QRCode = require("qrcode");
const bcrypt = require("bcryptjs");

const { pool, initDb } = require("./db");
const { answerPatientQuestion } = require("./rag");
const { WARDS, MEDICINE_FORMS, MEDICINE_UNITS } = require("./constants");
const { fetchRequestsWithItems, generatePatientId } = require("./helpers");

const app = express();

// ================= MIDDLEWARE =================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Sessions are stored in MySQL (in a `sessions` table this package creates
// automatically) rather than in-memory. This matters most on free hosting
// tiers like Render, which "sleep" the app after inactivity and restart the
// process on the next request - an in-memory session store would silently
// log everyone out every time that happens. Storing sessions in the same
// database the app already uses means logins survive restarts for free.
//
// NOTE: this store manages its own internal connection rather than reusing
// the app's `pool` from db.js - express-mysql-session expects a callback-style
// mysql2 connection internally, which isn't compatible with our promise-based
// pool (session writes would silently succeed but reads would silently fail).
const sessionStoreConfig = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "hospital_db",
};
if (process.env.DB_SSL === "true") {
  sessionStoreConfig.ssl = process.env.DB_SSL_CA_PATH
    ? { ca: fs.readFileSync(process.env.DB_SSL_CA_PATH) }
    : { rejectUnauthorized: false };
}
const sessionStore = new MySQLStore(sessionStoreConfig);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret123",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 8 }, // 8 hours
  })
);

// Small helper so we can `await` and still send a JSON error instead of
// crashing the whole process on a DB hiccup.
function asyncRoute(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.session.role !== role) {
      return res.status(401).json({ error: `Not logged in as ${role}` });
    }
    next();
  };
}

function requirePatientSession(req, res, next) {
  if (!req.session.patient_id) {
    return res.status(401).json({ error: "Not logged in as a patient" });
  }
  next();
}

// ================= SESSION =================
// The React app calls this on load to figure out who (if anyone) is logged
// in, and which dashboard to show.
app.get("/api/session", (req, res) => {
  res.json({
    role: req.session.role || null,
    username: req.session.username || null,
    patient_id: req.session.patient_id || null,
  });
});

// ================= STAFF LOGIN =================
app.post(
  "/api/login",
  asyncRoute(async (req, res) => {
    const role = (req.body.role || "").trim();
    const username = (req.body.username || "").trim();
    const password = (req.body.password || "").trim();

    if (!["admin", "nurse", "pharmacy"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const [rows] = await pool.query(
      "SELECT username, password_hash, role FROM users WHERE username=? AND role=?",
      [username, role]
    );

    if (rows.length > 0) {
      const [dbUsername, passwordHash] = rows[0];
      const valid = await bcrypt.compare(password, passwordHash);
      if (valid) {
        req.session.role = role;
        req.session.username = dbUsername;
        return res.json({ role });
      }
    }

    res.status(401).json({ error: "Invalid username or password" });
  })
);

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// ================= NURSE =================
app.get(
  "/api/nurse/data",
  requireRole("nurse"),
  asyncRoute(async (req, res) => {
    const status = req.query.status;
    const sort = req.query.sort;

    let whereSql = "1=1";
    const params = [];
    if (status && status !== "All") {
      whereSql += " AND delivery_status = ?";
      params.push(status);
    }
    const orderSql = sort === "old" ? "ORDER BY id ASC" : "ORDER BY id DESC";

    const data = await fetchRequestsWithItems(whereSql, params, orderSql);
    const [patients] = await pool.query("SELECT patient_id, name FROM patients ORDER BY name");
    const [medicines] = await pool.query("SELECT id, name, form, unit FROM medicines ORDER BY name");

    res.json({
      data,
      patients: patients.map((p) => ({ patient_id: p[0], name: p[1] })),
      medicines: medicines.map((m) => ({ id: m[0], name: m[1], form: m[2], unit: m[3] })),
      wards: WARDS,
    });
  })
);

app.post(
  "/api/nurse/requests",
  requireRole("nurse"),
  asyncRoute(async (req, res) => {
    const { patient_id, ward } = req.body;
    const diagnosis = (req.body.diagnosis || "").trim() || null;
    const instructions = (req.body.instructions || "").trim() || null;
    const now = formatNow();

    const [patientRows] = await pool.query("SELECT id FROM patients WHERE patient_id=?", [patient_id]);
    if (patientRows.length === 0 || !WARDS.includes(ward)) {
      return res.status(400).json({ error: "Please select a valid patient and ward." });
    }

    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const lineItems = [];
    for (const item of items) {
      if (!item.medicine_id || !item.quantity) continue;
      const [medRows] = await pool.query("SELECT name, unit FROM medicines WHERE id=?", [item.medicine_id]);
      if (medRows.length === 0) continue; // ignore anything not in the pharmacy catalog
      lineItems.push({ name: medRows[0][0], unit: medRows[0][1], quantity: item.quantity });
    }

    if (lineItems.length === 0) {
      return res.status(400).json({ error: "Please add at least one medicine from the list." });
    }

    const [result] = await pool.query(
      `INSERT INTO requests (patient_id, ward, request_time, qr_status, qr_time, delivery_status, delivery_time, diagnosis, instructions)
       VALUES (?, ?, ?, 'Pending', NULL, 'Pending', NULL, ?, ?)`,
      [patient_id, ward, now, diagnosis, instructions]
    );
    const requestId = result.insertId;

    for (const item of lineItems) {
      await pool.query(
        "INSERT INTO request_items (request_id, medicine_name, unit, quantity, cost) VALUES (?, ?, ?, ?, NULL)",
        [requestId, item.name, item.unit, item.quantity]
      );
    }

    res.json({ ok: true });
  })
);

// ================= PHARMACY =================
app.get(
  "/api/pharmacy/data",
  requireRole("pharmacy"),
  asyncRoute(async (req, res) => {
    const incoming_data = await fetchRequestsWithItems(
      "(qr_status IS NULL OR qr_status != 'Generated')",
      [],
      "ORDER BY id DESC"
    );

    const qr_filter = req.query.qr_filter;
    const delivery_filter = req.query.delivery_filter;
    const sort = req.query.sort || "latest";

    let whereSql = "qr_status='Generated'";
    const params = [];
    if (qr_filter) {
      whereSql += " AND qr_status=?";
      params.push(qr_filter);
    }
    if (delivery_filter) {
      whereSql += " AND delivery_status=?";
      params.push(delivery_filter);
    }
    const orderSql = sort === "latest" ? "ORDER BY id DESC" : "ORDER BY id ASC";

    const history_data = await fetchRequestsWithItems(whereSql, params, orderSql);
    const [medicines] = await pool.query("SELECT id, name, form, unit FROM medicines ORDER BY name");

    res.json({
      incoming_data,
      history_data,
      medicines: medicines.map((m) => ({ id: m[0], name: m[1], form: m[2], unit: m[3] })),
      medicineForms: MEDICINE_FORMS,
      medicineUnits: MEDICINE_UNITS,
    });
  })
);

app.post(
  "/api/pharmacy/item-cost",
  requireRole("pharmacy"),
  asyncRoute(async (req, res) => {
    const { item_id, cost } = req.body;
    await pool.query("UPDATE request_items SET cost=? WHERE id=?", [cost, item_id]);
    res.json({ ok: true });
  })
);

app.post(
  "/api/pharmacy/send-to-robot",
  requireRole("pharmacy"),
  asyncRoute(async (req, res) => {
    const { req_id } = req.body;
    await pool.query(
      "UPDATE requests SET delivery_status='Requested' WHERE id=? AND qr_status='Generated'",
      [req_id]
    );
    res.json({ ok: true });
  })
);

app.post(
  "/api/pharmacy/generate-qr",
  requireRole("pharmacy"),
  asyncRoute(async (req, res) => {
    const { req_id } = req.body;
    const now = formatNow();

    const [items] = await pool.query(
      "SELECT medicine_name, unit, quantity, cost FROM request_items WHERE request_id=?",
      [req_id]
    );
    const allPriced = items.length > 0 && items.every((it) => it[3] !== null);
    if (!allPriced) {
      return res.status(400).json({ error: "Price every medicine on this request first." });
    }

    const [headerRows] = await pool.query("SELECT patient_id, ward FROM requests WHERE id=?", [req_id]);
    const [patient_id, ward] = headerRows[0];

    const itemLines = items.map((it) => `- ${it[0]}: ${it[2]} ${it[1]}`).join("\n");
   const qrText = `Request ID: ${req_id}\nPatient: ${patient_id}\nWard: ${ward}\nMedicines:\n${itemLines}\n`;

    const qrDataUrl = await QRCode.toDataURL(qrText, { type: "image/png" });
    const qrData = qrDataUrl.replace(/^data:image\/png;base64,/, "");

    await pool.query(
      "UPDATE requests SET qr_data=?, qr_status='Generated', qr_time=? WHERE id=?",
      [qrData, now, req_id]
    );

    res.json({
      qr_data: qrData,
      req_id,
      patient_id,
      ward,
      items: items.map((it) => ({ name: it[0], unit: it[1], quantity: it[2] })),
    });
  })
);

app.post(
  "/api/pharmacy/medicines",
  requireRole("pharmacy"),
  asyncRoute(async (req, res) => {
    const { med_name, med_form, med_unit } = req.body;
    if (!med_name || !med_form || !med_unit) {
      return res.status(400).json({ error: "Name, form, and unit are all required." });
    }
    try {
      await pool.query(
        "INSERT INTO medicines (name, form, unit, created_at) VALUES (?, ?, ?, ?)",
        [med_name.trim(), med_form, med_unit.trim(), formatNow()]
      );
    } catch (err) {
      if (err.code !== "ER_DUP_ENTRY") throw err;
      return res.status(409).json({ error: "That medicine is already in the catalog." });
    }
    res.json({ ok: true });
  })
);

app.delete(
  "/api/pharmacy/medicines/:id",
  requireRole("pharmacy"),
  asyncRoute(async (req, res) => {
    await pool.query("DELETE FROM medicines WHERE id=?", [req.params.id]);
    res.json({ ok: true });
  })
);

// ================= CONSULTATIONS (public booking form on the homepage) =================
app.post(
  "/api/consultations",
  asyncRoute(async (req, res) => {
    const name = (req.body.name || "").trim();
    const phone = (req.body.phone || "").trim();

    if (!name || !phone) {
      return res.status(400).json({ error: "Name and phone number are both required" });
    }
    if (!/^[0-9+\-\s()]{7,20}$/.test(phone)) {
      return res.status(400).json({ error: "Please enter a valid phone number" });
    }

    await pool.query(
      "INSERT INTO consultations (name, phone, status, created_at) VALUES (?, ?, 'New', ?)",
      [name, phone, formatNow()]
    );

    res.json({ ok: true });
  })
);

app.post(
  "/api/admin/consultations/:id/status",
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    const { status } = req.body;
    await pool.query("UPDATE consultations SET status=? WHERE id=?", [status, req.params.id]);
    res.json({ ok: true });
  })
);

app.delete(
  "/api/admin/consultations/:id",
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    await pool.query("DELETE FROM consultations WHERE id=?", [req.params.id]);
    res.json({ ok: true });
  })
);

// ================= ROBOT =================


// ================= PATIENT PORTAL =================
app.post(
  "/api/patient/login",
  asyncRoute(async (req, res) => {
    const pid = (req.body.patient_id || "").trim();
    if (!pid) return res.status(400).json({ error: "Please enter your Patient ID" });

    const [rows] = await pool.query("SELECT id FROM patients WHERE patient_id=? LIMIT 1", [pid]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "No patient found with that ID" });
    }

    req.session.patient_id = pid;
    res.json({ ok: true, patient_id: pid });
  })
);

app.get(
  "/api/patient/dashboard",
  requirePatientSession,
  asyncRoute(async (req, res) => {
    const pid = req.session.patient_id;
    const data = await fetchRequestsWithItems("patient_id=?", [pid], "ORDER BY id DESC");

    let total = 0;
    let paid = 0;
    let unpaid = 0;
    const byDate = {};

    for (const r of data) {
      total += r.total_cost;
      if (r.payment_status === "Paid") paid += r.total_cost;
      else unpaid += r.total_cost;

      const datePart = (r.request_time || "").split(" ")[0] || "Unknown";
      byDate[datePart] = (byDate[datePart] || 0) + r.total_cost;
    }

    const chartLabels = Object.keys(byDate).sort((a, b) => {
      const [d1, m1, y1] = a.split("-").map(Number);
      const [d2, m2, y2] = b.split("-").map(Number);
      return new Date(y1, m1 - 1, d1) - new Date(y2, m2 - 1, d2);
    });
    const chartValues = chartLabels.map((l) => byDate[l]);

    res.json({
      patient_id: pid,
      data,
      total,
      paid,
      unpaid,
      chartLabels,
      chartValues,
    });
  })
);

app.post(
  "/api/patient/pay",
  requirePatientSession,
  asyncRoute(async (req, res) => {
    const { req_id } = req.body;
    const pid = req.session.patient_id;
    const now = formatNow();

    await pool.query(
      "UPDATE requests SET payment_status='Paid', payment_time=? WHERE id=? AND patient_id=?",
      [now, req_id, pid]
    );

    res.json({ ok: true });
  })
);

app.post(
  "/api/patient/chat",
  requirePatientSession,
  asyncRoute(async (req, res) => {
    const pid = req.session.patient_id;
    const question = (req.body.message || "").trim();

    if (!question) return res.status(400).json({ error: "Message is required" });

    const records = await fetchRequestsWithItems("patient_id=?", [pid], "ORDER BY id DESC LIMIT 20");

    try {
      const answer = await answerPatientQuestion(question, records);
      res.json({ answer });
    } catch (err) {
      console.error("Chat error:", err);

      let message =
        "Sorry, the assistant is unavailable right now. Make sure GEMINI_API_KEY is set in .env.";

      const status = err.status || (err.error && err.error.code);
      const isOverloaded =
        status === 503 ||
        (err.message && (err.message.includes("UNAVAILABLE") || err.message.includes("overloaded")));

      if (isOverloaded) {
        message =
          "Google's AI service is temporarily overloaded (this is on their end, not a bug in the app). It already retried a couple of times automatically - please wait a moment and try asking again.";
      } else if (err.status === 404 || (err.message && err.message.includes("NOT_FOUND"))) {
        message =
          "The AI model configured (GEMINI_MODEL in .env) is no longer available. Try setting GEMINI_MODEL=gemini-3-flash-preview (or check https://ai.google.dev/gemini-api/docs/models for the current free model name).";
      }

      res.status(500).json({ error: message });
    }
  })
);

app.post("/api/patient/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// ================= BILLING (staff-facing lookup, no auth like the original) =================
app.post(
  "/api/billing",
  asyncRoute(async (req, res) => {
    const pid = req.body.patient_id;
    const data = await fetchRequestsWithItems("patient_id=?", [pid], "ORDER BY id DESC");
    const total = data.reduce((sum, r) => sum + r.total_cost, 0);
    res.json({ data, total });
  })
);

// ================= ADMIN =================
app.get(
  "/api/admin/data",
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    const allRequests = await fetchRequestsWithItems("1=1", [], "ORDER BY id DESC");
    const [users] = await pool.query("SELECT id, username, role FROM users ORDER BY role, username");
    const [patientRows] = await pool.query(
      "SELECT patient_id, name, created_at FROM patients ORDER BY id DESC"
    );
    const [consultRows] = await pool.query(
      "SELECT id, name, phone, status, created_at FROM consultations ORDER BY id DESC"
    );

    let totalRevenue = 0;
    let pendingRevenue = 0;
    const patientTotals = {};
    const wardCounts = {};
    const deliveryCounts = { Pending: 0, Delivered: 0, Other: 0 };
    const revenueByDate = {};

    for (const r of allRequests) {
      const cost = r.total_cost;
      const ward = r.ward || "Unknown";
      const datePart = (r.request_time || "").split(" ")[0] || "Unknown";

      patientTotals[r.patient_id] = (patientTotals[r.patient_id] || 0) + cost;
      wardCounts[ward] = (wardCounts[ward] || 0) + 1;

      if (r.delivery_status === "Pending") deliveryCounts.Pending++;
      else if (r.delivery_status === "Delivered") deliveryCounts.Delivered++;
      else deliveryCounts.Other++;

      if (r.payment_status === "Paid") {
        totalRevenue += cost;
        revenueByDate[datePart] = (revenueByDate[datePart] || 0) + cost;
      } else {
        pendingRevenue += cost;
      }
    }

    const revenueDates = Object.keys(revenueByDate).sort((a, b) => {
      const [d1, m1, y1] = a.split("-").map(Number);
      const [d2, m2, y2] = b.split("-").map(Number);
      return new Date(y1, m1 - 1, d1) - new Date(y2, m2 - 1, d2);
    });
    const revenueValues = revenueDates.map((d) => revenueByDate[d]);

    const patients = patientRows.map((p) => ({
      patient_id: p[0],
      name: p[1],
      created_at: p[2],
      total: patientTotals[p[0]] || 0,
    }));

    res.json({
      stats: {
        totalPatients: patients.length,
        totalRequests: allRequests.length,
        totalRevenue,
        pendingRevenue,
      },
      allRequests,
      users: users.map((u) => ({ id: u[0], username: u[1], role: u[2] })),
      patients,
      consultations: consultRows.map((c) => ({
        id: c[0],
        name: c[1],
        phone: c[2],
        status: c[3],
        created_at: c[4],
      })),
      wardLabels: Object.keys(wardCounts),
      wardValues: Object.values(wardCounts),
      deliveryCounts,
      revenueDates,
      revenueValues,
    });
  })
);

app.post(
  "/api/admin/requests/update",
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    const { req_id, delivery_status } = req.body;
    const now = formatNow();
    await pool.query("UPDATE requests SET delivery_status=?, delivery_time=? WHERE id=?", [
      delivery_status,
      now,
      req_id,
    ]);
    res.json({ ok: true });
  })
);

app.post(
  "/api/admin/patients",
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    const name = (req.body.name || "").trim();
    if (!name) return res.status(400).json({ error: "Name is required" });

    const patientId = await generatePatientId();
    await pool.query("INSERT INTO patients (patient_id, name, created_at) VALUES (?, ?, ?)", [
      patientId,
      name,
      formatNow(),
    ]);

    res.json({ patient_id: patientId, name });
  })
);

app.delete(
  "/api/admin/patients/:patient_id",
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    const { patient_id } = req.params;

    const [existing] = await pool.query("SELECT id FROM requests WHERE patient_id=? LIMIT 1", [patient_id]);
    if (existing.length > 0) {
      return res.status(409).json({ error: "This patient already has requests on file and can't be deleted." });
    }

    await pool.query("DELETE FROM patients WHERE patient_id=?", [patient_id]);
    res.json({ ok: true });
  })
);

app.post(
  "/api/admin/users",
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password || !["admin", "nurse", "pharmacy"].includes(role)) {
      return res.status(400).json({ error: "Username, password, and a valid role are required." });
    }
    const hash = await bcrypt.hash(password, 10);
    try {
      await pool.query("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)", [
        username.trim(),
        hash,
        role,
      ]);
    } catch (err) {
      if (err.code !== "ER_DUP_ENTRY") throw err;
      return res.status(409).json({ error: "That username already exists." });
    }
    res.json({ ok: true });
  })
);

app.delete(
  "/api/admin/users/:id",
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    const [rows] = await pool.query("SELECT username FROM users WHERE id=?", [req.params.id]);
    if (rows.length && rows[0][0] === req.session.username) {
      return res.status(400).json({ error: "You can't delete your own account while logged in." });
    }
    await pool.query("DELETE FROM users WHERE id=?", [req.params.id]);
    res.json({ ok: true });
  })
);

// ================= HELPERS =================
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

function getLocalNetworkIp() {
  const os = require("os");
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) return iface.address;
    }
  }
  return null;
}

// ================= STATIC REACT FRONTEND =================
// The React app is built into client/dist (see README - `npm run build`).
// Express serves it as static files, with a catch-all so React Router's
// client-side routes (e.g. /nurse, /patient/dashboard) work on direct
// refresh/URL entry too, not just via in-app navigation.
const clientDist = path.join(__dirname, "client", "dist");

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res
      .status(200)
      .send(
        "The React frontend hasn't been built yet. Run <code>cd client && npm install && npm run build</code>, then restart the server. See README.md for details."
      );
  });
}

// ================= ROBOT =================
function requireRobotKey(req, res, next) {
  const key = req.header("X-Robot-Key");
  if (!key || key !== process.env.ROBOT_API_KEY) {
    return res.status(401).json({ error: "Invalid robot key" });
  }
  next();
}

const ROBOT_STATUSES = ["Picked Up", "In Transit", "Obstacle Detected", "Delivered", "Failed"];

app.get(
  "/api/robot/next-job",
  requireRobotKey,
  asyncRoute(async (req, res) => {
    const [rows] = await pool.query(
      "SELECT id, ward, patient_id FROM requests WHERE delivery_status='Requested' ORDER BY id ASC LIMIT 1"
    );
    if (rows.length === 0) {
      return res.json({ job: null });
    }
    const [id, ward, patient_id] = rows[0];
    await pool.query("UPDATE requests SET delivery_status='Assigned' WHERE id=?", [id]);
    res.json({ job: { req_id: id, ward, patient_id, expected_id: id } });
  })
);

app.post(
  "/api/robot/status",
  requireRobotKey,
  asyncRoute(async (req, res) => {
    const { req_id, status } = req.body;
    if (!ROBOT_STATUSES.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const now = formatNow();
    await pool.query("UPDATE requests SET delivery_status=?, delivery_time=? WHERE id=?", [
      status,
      now,
      req_id,
    ]);
    res.json({ ok: true });
  })
);

app.get(
  "/api/deliveries/status",
  asyncRoute(async (req, res) => {
    if (req.session.role) {
      const [rows] = await pool.query(
        `SELECT id, patient_id, ward, delivery_status, delivery_time FROM requests
         WHERE delivery_status IS NOT NULL AND delivery_status NOT IN ('Pending')
         ORDER BY id DESC LIMIT 20`
      );
      return res.json({
        deliveries: rows.map((r) => ({
          req_id: r[0],
          patient_id: r[1],
          ward: r[2],
          status: r[3],
          updated: r[4],
        })),
      });
    }
    if (req.session.patient_id) {
      const [rows] = await pool.query(
        `SELECT id, ward, delivery_status, delivery_time FROM requests
         WHERE patient_id=? AND delivery_status IS NOT NULL AND delivery_status NOT IN ('Pending')
         ORDER BY id DESC LIMIT 5`,
        [req.session.patient_id]
      );
      return res.json({
        deliveries: rows.map((r) => ({ req_id: r[0], ward: r[1], status: r[2], updated: r[3] })),
      });
    }
    res.status(401).json({ error: "Not logged in" });
  })
);

// ================= ERROR HANDLER =================
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong. Check the server logs for details." });
});

// ================= RUN =================
const PORT = process.env.PORT || 5000;

initDb()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      const lanIp = getLocalNetworkIp();
      console.log("Hospital webapp is running!");
      console.log(`  On this computer:      http://localhost:${PORT}`);
      if (lanIp) {
        console.log(`  On your phone/tablet:  http://${lanIp}:${PORT}  (must be on the same Wi-Fi)`);
      } else {
        console.log("  Could not detect a LAN IP - connect to Wi-Fi to access this from your phone.");
      }
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
