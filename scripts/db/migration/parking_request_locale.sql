ALTER TABLE parking_reservations
    ADD COLUMN IF NOT EXISTS request_locale VARCHAR(10) NULL;
