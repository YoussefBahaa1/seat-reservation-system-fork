ALTER TABLE parking_reservations
    ADD COLUMN IF NOT EXISTS justification VARCHAR(500) NULL;
