UPDATE desks
SET workstation_type = CASE MOD(desk_id, 4)
    WHEN 0 THEN 'Standard'
    WHEN 1 THEN 'Silent'
    WHEN 2 THEN 'Ergonomic'
    ELSE 'Premium'
END
WHERE workstation_type IS NULL OR workstation_type = '';

UPDATE desks
SET monitors_quantity = MOD(desk_id, 4)
WHERE monitors_quantity IS NULL;

UPDATE desks
SET desk_height_adjustable = CASE WHEN MOD(desk_id, 2) = 0 THEN 1 ELSE 0 END
WHERE desk_height_adjustable IS NULL;

UPDATE desks
SET technology_docking_station = CASE WHEN MOD(desk_id, 2) = 0 THEN 1 ELSE 0 END
WHERE technology_docking_station IS NULL;

UPDATE desks
SET technology_webcam = CASE WHEN MOD(desk_id, 3) IN (0, 2) THEN 1 ELSE 0 END
WHERE technology_webcam IS NULL;

UPDATE desks
SET technology_headset = CASE WHEN MOD(desk_id, 3) IN (1, 2) THEN 1 ELSE 0 END
WHERE technology_headset IS NULL;

UPDATE desks
SET special_features = CASE WHEN MOD(desk_id, 2) = 0 THEN 'Placeholder special feature' ELSE '' END
WHERE special_features IS NULL OR special_features = '';
