-- Seed deterministic but varied workstation metadata for all desks.
-- This is intentionally not truly random so repeated DB inits stay stable.

UPDATE desks
SET
    workstation_type = CASE MOD(desk_id, 4)
        WHEN 0 THEN 'Standard'
        WHEN 1 THEN 'Silent'
        WHEN 2 THEN 'Ergonomic'
        ELSE 'Premium'
    END,
    monitors_quantity = CASE MOD(desk_id, 6)
        WHEN 0 THEN 0
        WHEN 1 THEN 1
        WHEN 2 THEN 1
        WHEN 3 THEN 2
        WHEN 4 THEN 2
        ELSE 3
    END,
    desk_height_adjustable = CASE
        WHEN MOD(desk_id, 3) = 0 OR MOD(desk_id, 5) = 0 THEN 1
        ELSE 0
    END,
    technology_docking_station = CASE
        WHEN MOD(desk_id, 2) = 0 THEN 1
        ELSE 0
    END,
    technology_webcam = CASE
        WHEN MOD(desk_id, 4) IN (1, 2) THEN 1
        ELSE 0
    END,
    technology_headset = CASE
        WHEN MOD(desk_id, 5) IN (0, 1) THEN 1
        ELSE 0
    END,
    special_features = CASE MOD(desk_id, 10)
        WHEN 0 THEN ''
        WHEN 1 THEN 'Desk lamp'
        WHEN 2 THEN 'Privacy side panel'
        WHEN 3 THEN 'Footrest included'
        WHEN 4 THEN 'Near window'
        WHEN 5 THEN ''
        WHEN 6 THEN 'Extra writing space'
        WHEN 7 THEN 'Dual power outlets'
        WHEN 8 THEN 'Quiet corner'
        ELSE 'Whiteboard nearby'
    END;
