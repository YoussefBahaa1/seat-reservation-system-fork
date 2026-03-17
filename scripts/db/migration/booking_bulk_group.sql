ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS bulk_group_id VARCHAR(36) NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_bulk_group_id
    ON bookings (bulk_group_id);
