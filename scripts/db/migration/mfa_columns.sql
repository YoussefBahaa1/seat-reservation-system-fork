-- Add MFA columns to users table
-- Run this migration on existing databases
ALTER TABLE users ADD COLUMN mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN mfa_secret VARCHAR(255) NULL;
