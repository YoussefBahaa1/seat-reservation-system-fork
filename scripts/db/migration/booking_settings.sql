-- Create booking_settings table and seed default singleton row
CREATE TABLE IF NOT EXISTS booking_settings (
    id BIGINT NOT NULL PRIMARY KEY,
    lead_time_minutes INT NOT NULL DEFAULT 30,
    max_duration_minutes INT NULL DEFAULT 360,
    max_advance_days INT NULL DEFAULT 30
);

INSERT INTO booking_settings (id, lead_time_minutes, max_duration_minutes, max_advance_days)
VALUES (1, 30, 360, 30)
ON DUPLICATE KEY UPDATE
    lead_time_minutes = VALUES(lead_time_minutes),
    max_duration_minutes = VALUES(max_duration_minutes),
    max_advance_days = VALUES(max_advance_days);
