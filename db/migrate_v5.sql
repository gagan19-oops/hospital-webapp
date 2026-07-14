-- Adds diagnosis/instructions columns to an existing v4 install, so the
-- patient chatbot can answer "why was this prescribed" / "when do I take
-- it" using real doctor/nurse-entered data instead of guessing.
--
-- Note: the app also runs these same ALTER TABLE statements automatically
-- on startup (see db.js), so running this file manually is optional - it's
-- here mainly for reference / manual setup, matching the other migrate_*.sql
-- files in this folder.
--
-- Usage:
--   mysql -u root -p hospital_db < db/migrate_v5.sql

USE hospital_db;

ALTER TABLE requests ADD COLUMN diagnosis VARCHAR(255);
ALTER TABLE requests ADD COLUMN instructions VARCHAR(500);
