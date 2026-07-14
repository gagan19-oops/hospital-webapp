-- Run this ONCE if you already set up the database before (i.e. you already
-- have a `requests` table without payment columns). Safe to skip if you're
-- setting up fresh - db/schema.sql (and the app on startup) already includes
-- everything below.
--
-- Usage:
--   mysql -u root -p hospital_db < db/migrate_v3.sql

USE hospital_db;

-- Add payment tracking columns to existing requests table.
-- NOTE: run this only ONCE. If you run it twice you'll get a
-- "Duplicate column name" error - that's harmless and just means the
-- columns are already there (the app itself handles this gracefully on
-- every startup, this file is only needed once for manual/first migration).
ALTER TABLE requests
  ADD COLUMN payment_status VARCHAR(20) DEFAULT 'Unpaid',
  ADD COLUMN payment_time VARCHAR(50);

-- Backfill: anything already marked Delivered we'll leave as Unpaid by
-- default so nothing is falsely marked paid - patients can pay from their
-- dashboard.
UPDATE requests SET payment_status = 'Unpaid' WHERE payment_status IS NULL;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL
);
