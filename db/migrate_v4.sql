-- Upgrades an existing v2/v3 install (single medicine per request, free-typed
-- patient IDs and medicine names) to v4 (multiple medicines per request,
-- admin-managed patients, pharmacy-managed medicine catalog).
--
-- IMPORTANT: run this ONLY ONCE. Running it twice will duplicate your
-- request_items rows. It does NOT delete your old requests.medicine /
-- requests.quantity / requests.cost columns - they're just left unused
-- going forward (harmless to leave, safe to manually drop later if you want).
--
-- Usage:
--   mysql -u root -p hospital_db < db/migrate_v4.sql

USE hospital_db;

CREATE TABLE IF NOT EXISTS patients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  created_at VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS medicines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  form VARCHAR(50) NOT NULL,
  unit VARCHAR(30) NOT NULL,
  created_at VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS request_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  medicine_name VARCHAR(150) NOT NULL,
  unit VARCHAR(30),
  quantity DECIMAL(10,2) NOT NULL,
  cost DECIMAL(10,2),
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
);

-- Backfill patients from whatever patient_id strings already exist in
-- requests, so old data keeps working with the new admin-managed patient
-- list. Name is set to the same value as the ID as a placeholder - the
-- admin can rename these properly from the Admin Dashboard later.
INSERT IGNORE INTO patients (patient_id, name, created_at)
SELECT DISTINCT patient_id, patient_id, NOW()
FROM requests
WHERE patient_id IS NOT NULL AND patient_id <> '';

-- Backfill the medicine catalog from whatever medicine names were
-- previously free-typed. Form/unit are placeholders ("Other" / "unit(s)") -
-- pharmacy should review and correct these from the Pharmacy Dashboard.
INSERT IGNORE INTO medicines (name, form, unit, created_at)
SELECT DISTINCT medicine, 'Other', 'unit(s)', NOW()
FROM requests
WHERE medicine IS NOT NULL AND medicine <> '';

-- Turn each old single-medicine request row into a request_items row
-- attached to that same request, carrying over its quantity and cost.
INSERT INTO request_items (request_id, medicine_name, unit, quantity, cost)
SELECT id, medicine, 'unit(s)', quantity, cost
FROM requests
WHERE medicine IS NOT NULL AND medicine <> '';
