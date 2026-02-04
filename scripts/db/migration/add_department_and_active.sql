-- Add department and active columns to users table
-- Run this migration on existing databases

-- Add department field (free-text, nullable)
ALTER TABLE users ADD COLUMN department VARCHAR(255) NULL;

-- Add active field (boolean, defaults to true for existing users)
ALTER TABLE users ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;
