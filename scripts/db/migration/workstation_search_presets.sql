ALTER TABLE users
    ADD COLUMN IF NOT EXISTS workstation_search_presets TEXT NULL;
