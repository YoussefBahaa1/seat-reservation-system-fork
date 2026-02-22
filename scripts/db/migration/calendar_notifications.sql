-- Outlook/ICS notification columns
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS calendar_uid VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS calendar_sequence INT NOT NULL DEFAULT 0;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS notify_booking_create BIT(1) NOT NULL DEFAULT b'1',
    ADD COLUMN IF NOT EXISTS notify_booking_update BIT(1) NOT NULL DEFAULT b'1',
    ADD COLUMN IF NOT EXISTS notify_booking_cancel BIT(1) NOT NULL DEFAULT b'1';
