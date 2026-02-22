ALTER TABLE parking_reservations
ADD COLUMN IF NOT EXISTS reservation_status VARCHAR(20) NULL;

UPDATE parking_reservations
SET reservation_status = 'APPROVED'
WHERE reservation_status IS NULL;
