-- Persist per-user preferred language so backend emails can be localized by account setting.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) NOT NULL DEFAULT 'en';

UPDATE users
SET preferred_language = 'en'
WHERE preferred_language IS NULL OR preferred_language = '';
