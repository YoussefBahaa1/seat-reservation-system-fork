DROP PROCEDURE IF EXISTS migrate_workstation_schema;
DELIMITER //
CREATE PROCEDURE migrate_workstation_schema()
BEGIN
    DECLARE CONTINUE HANDLER FOR 1091 BEGIN END;

    ALTER TABLE desks DROP FOREIGN KEY FKnj02jj3tcyb5e604r1ufb7gfi;
    ALTER TABLE desks DROP COLUMN equipment_id;
    ALTER TABLE desks DROP COLUMN workstation_identifier;
    ALTER TABLE desks DROP COLUMN monitors_size;
    DROP TABLE IF EXISTS equipments;

    ALTER TABLE desks ADD COLUMN IF NOT EXISTS workstation_type VARCHAR(50) NULL;
    ALTER TABLE desks ADD COLUMN IF NOT EXISTS monitors_quantity INT NULL;
    ALTER TABLE desks ADD COLUMN IF NOT EXISTS desk_height_adjustable TINYINT(1) NULL;
    ALTER TABLE desks ADD COLUMN IF NOT EXISTS technology_docking_station TINYINT(1) NULL;
    ALTER TABLE desks ADD COLUMN IF NOT EXISTS technology_webcam TINYINT(1) NULL;
    ALTER TABLE desks ADD COLUMN IF NOT EXISTS technology_headset TINYINT(1) NULL;
    ALTER TABLE desks ADD COLUMN IF NOT EXISTS special_features TEXT NULL;
END//
DELIMITER ;

CALL migrate_workstation_schema();
DROP PROCEDURE IF EXISTS migrate_workstation_schema;
