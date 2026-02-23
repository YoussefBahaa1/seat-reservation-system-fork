CREATE TABLE IF NOT EXISTS parking_spots (
    spot_label VARCHAR(255) NOT NULL,
    spot_type VARCHAR(40) NOT NULL DEFAULT 'STANDARD',
    covered TINYINT(1) NOT NULL DEFAULT 0,
    manually_blocked TINYINT(1) NOT NULL DEFAULT 0,
    charging_kw INT NULL,
    PRIMARY KEY (spot_label)
);

ALTER TABLE parking_spots
ADD COLUMN IF NOT EXISTS manually_blocked TINYINT(1) NOT NULL DEFAULT 0;

INSERT INTO parking_spots (spot_label, spot_type, covered, manually_blocked, charging_kw)
VALUES
    ('23', 'SPECIAL_CASE', 0, 0, NULL),
    ('29', 'STANDARD', 0, 0, NULL),
    ('30', 'ACCESSIBLE', 0, 0, NULL),
    ('31', 'STANDARD', 0, 0, NULL),
    ('32', 'STANDARD', 0, 0, NULL),
    ('33', 'STANDARD', 0, 0, NULL),
    ('34', 'STANDARD', 0, 0, NULL),
    ('35', 'STANDARD', 0, 0, NULL),
    ('36', 'STANDARD', 0, 0, NULL),
    ('37', 'STANDARD', 0, 0, NULL),
    ('38', 'STANDARD', 0, 0, NULL),
    ('39', 'STANDARD', 0, 0, NULL),
    ('40', 'STANDARD', 0, 0, NULL),
    ('43', 'STANDARD', 0, 0, NULL)
ON DUPLICATE KEY UPDATE spot_label = spot_label;
