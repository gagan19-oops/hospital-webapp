-- Run this once against your MySQL server for a FRESH install.
-- (The app also runs this same CREATE TABLE automatically on startup, so this
-- file is here mainly for reference / manual setup.)
--
-- Already have this app running from before? Use db/migrate_v4.sql instead -
-- it upgrades your existing data without wiping it.

CREATE DATABASE IF NOT EXISTS hospital_db;
USE hospital_db;

-- Patients are now real records, created by the admin (who assigns/generates
-- the Patient ID) rather than free-typed by whoever fills out a form.
CREATE TABLE IF NOT EXISTS patients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  created_at VARCHAR(50)
);

-- The pharmacy-owned medicine catalog. Nurses can only select medicines from
-- this list on the request form (no free-typing), so names/units stay
-- consistent hospital-wide.
CREATE TABLE IF NOT EXISTS medicines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  form VARCHAR(50) NOT NULL,   -- Tablet, Capsule, Syrup/Liquid, Injection, Ointment, Other
  unit VARCHAR(30) NOT NULL,   -- mg, ml, tablet(s), dose(s), etc.
  created_at VARCHAR(50)
);

-- A medicine REQUEST is now a "header" row - one per nurse submission,
-- possibly containing several medicines (see request_items below).
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
  diagnosis VARCHAR(255),   -- condition/diagnosis noted by the doctor/nurse at request time
  instructions VARCHAR(500) -- dosage/timing instructions noted by the doctor/nurse at request time
);

-- One row per medicine within a request. Medicine name/unit are copied in
-- at request time (a snapshot), so history stays accurate even if the
-- catalog entry is later renamed or removed. Cost is set per line by
-- pharmacy; the request's total is the sum of its items' costs.
CREATE TABLE IF NOT EXISTS request_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  medicine_name VARCHAR(150) NOT NULL,
  unit VARCHAR(30),
  quantity DECIMAL(10,2) NOT NULL,
  cost DECIMAL(10,2),
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
);

-- Staff accounts (admin / nurse / pharmacy). Passwords are bcrypt hashes.
-- The app seeds default admin/nurse/pharmacy accounts automatically on first
-- run if this table is empty, using the same default credentials as before
-- (admin/admin123, nurse/nurse123, pharmacy/pharm123) - see db.js.
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL
);
