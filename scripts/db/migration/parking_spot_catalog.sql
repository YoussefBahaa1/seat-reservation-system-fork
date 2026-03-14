ALTER TABLE parking_spots
ADD COLUMN IF NOT EXISTS display_label VARCHAR(255) NULL;

ALTER TABLE parking_spots
ADD COLUMN IF NOT EXISTS active TINYINT(1) NOT NULL DEFAULT 1;

UPDATE parking_spots
SET display_label = spot_label
WHERE display_label IS NULL OR TRIM(display_label) = '';

UPDATE parking_spots
SET active = 1
WHERE active IS NULL;
