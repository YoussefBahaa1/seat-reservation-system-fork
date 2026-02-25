-- Notification preferences for parking decisions
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS notify_parking_decision BIT(1) NOT NULL DEFAULT b'1';
