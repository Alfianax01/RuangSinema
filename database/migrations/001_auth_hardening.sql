-- =================================================================
-- Migrasi 001: Pengerasan Autentikasi & Tabel Audit Keamanan
-- Tanggal: 2026-09-03
-- =================================================================

USE `bioskopku_db`;

-- 1. Tambah Kolom Keamanan pada Tabel users
ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `password_hash` VARCHAR(255) NULL AFTER `password`,
  ADD COLUMN IF NOT EXISTS `password_algo` VARCHAR(30) DEFAULT 'pbkdf2_sha512' AFTER `password_hash`,
  ADD COLUMN IF NOT EXISTS `mfa_enabled` TINYINT(1) DEFAULT 0 AFTER `role`,
  ADD COLUMN IF NOT EXISTS `mfa_type` VARCHAR(20) DEFAULT 'totp' AFTER `mfa_enabled`,
  ADD COLUMN IF NOT EXISTS `mfa_secret_enc` TEXT NULL AFTER `mfa_type`,
  ADD COLUMN IF NOT EXISTS `failed_attempts` INT DEFAULT 0 AFTER `mfa_secret_enc`,
  ADD COLUMN IF NOT EXISTS `locked_until` TIMESTAMP NULL AFTER `failed_attempts`,
  ADD COLUMN IF NOT EXISTS `last_login_at` TIMESTAMP NULL AFTER `locked_until`,
  ADD COLUMN IF NOT EXISTS `last_login_ip` VARCHAR(64) NULL AFTER `last_login_at`;

-- 2. Tabel Catatan Percobaan Login (login_attempts)
CREATE TABLE IF NOT EXISTS `login_attempts` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(150) NOT NULL,
  `ip_address` VARCHAR(64) NOT NULL,
  `user_agent` TEXT NULL,
  `device` VARCHAR(100) NULL,
  `browser` VARCHAR(100) NULL,
  `os` VARCHAR(100) NULL,
  `country` VARCHAR(100) NULL,
  `region` VARCHAR(100) NULL,
  `city` VARCHAR(100) NULL,
  `latitude` DECIMAL(10, 6) NULL,
  `longitude` DECIMAL(10, 6) NULL,
  `isp` VARCHAR(150) NULL,
  `is_vpn` TINYINT(1) DEFAULT 0,
  `success` TINYINT(1) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_email_created` (`email`, `created_at`),
  INDEX `idx_ip_created` (`ip_address`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabel Event Keamanan & Audit Log Real-time (security_events)
CREATE TABLE IF NOT EXISTS `security_events` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NULL,
  `email` VARCHAR(150) NOT NULL,
  `type` VARCHAR(50) NOT NULL, -- 'login_blocked', 'mfa_failed', 'new_device_login', 'password_changed', 'token_revoked'
  `severity` VARCHAR(20) DEFAULT 'warning', -- 'info', 'warning', 'critical'
  `ip_address` VARCHAR(64) NOT NULL,
  `country` VARCHAR(100) NULL,
  `region` VARCHAR(100) NULL,
  `city` VARCHAR(100) NULL,
  `latitude` DECIMAL(10, 6) NULL,
  `longitude` DECIMAL(10, 6) NULL,
  `isp` VARCHAR(150) NULL,
  `device` VARCHAR(100) NULL,
  `metadata_json` JSON NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_type_created` (`type`, `created_at`),
  INDEX `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabel Kode Pemulihan 2FA Sekali Pakai (mfa_recovery_codes)
CREATE TABLE IF NOT EXISTS `mfa_recovery_codes` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `code_hash` VARCHAR(64) NOT NULL,
  `used_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_user_code` (`user_id`, `code_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabel Perangkat Terpercaya (trusted_devices - 30 Hari)
CREATE TABLE IF NOT EXISTS `trusted_devices` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `device_token_hash` VARCHAR(64) NOT NULL UNIQUE,
  `label` VARCHAR(150) NULL,
  `ip_address` VARCHAR(64) NULL,
  `user_agent` TEXT NULL,
  `last_seen_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `expires_at` TIMESTAMP NOT NULL,
  INDEX `idx_token_hash` (`device_token_hash`),
  INDEX `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabel Refresh Tokens (refresh_tokens - Hashed & Revocable)
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `token_hash` VARCHAR(64) NOT NULL UNIQUE,
  `ip_address` VARCHAR(64) NULL,
  `user_agent` TEXT NULL,
  `expires_at` TIMESTAMP NOT NULL,
  `revoked_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_user_tokens` (`user_id`, `revoked_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Tabel Daftar Blokir IP (ip_blocklist)
CREATE TABLE IF NOT EXISTS `ip_blocklist` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `ip_address` VARCHAR(64) NOT NULL UNIQUE,
  `reason` VARCHAR(255) NULL,
  `blocked_by` VARCHAR(100) DEFAULT 'system',
  `expires_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_ip` (`ip_address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Tabel Token Reset Password (password_reset_tokens - Single-use, 15m)
CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `token_hash` VARCHAR(64) NOT NULL UNIQUE,
  `used_at` TIMESTAMP NULL,
  `expires_at` TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_token_hash` (`token_hash`),
  INDEX `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

