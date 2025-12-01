-- migrations/create_tables.sql
-- Creates Audits, Devices, and Telemetry tables if they do not exist

CREATE TABLE IF NOT EXISTS `Audits` (
  `audit_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `audit_name` VARCHAR(255) NOT NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `Devices` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `audit_id` INT NOT NULL,
  `device_class` VARCHAR(255) NULL,
  `description` VARCHAR(255) NULL,
  `power_rating_watts` INT NULL,
  `quantity` INT NULL,
  `hours_per_day` FLOAT NULL,
  `daily_kwh_total` FLOAT NULL,
  CONSTRAINT `fk_devices_audit` FOREIGN KEY (`audit_id`) REFERENCES `Audits`(`audit_id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `Telemetry` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `source` VARCHAR(255) NULL,
  `timestamp_utc` DATETIME NULL,
  `wattage` FLOAT NULL,
  `raw` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
