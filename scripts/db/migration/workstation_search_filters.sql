ALTER TABLE users
    ADD COLUMN IF NOT EXISTS workstation_search_filters TEXT NULL;
