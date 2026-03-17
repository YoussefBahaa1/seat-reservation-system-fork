-- Set fixed desks per room by taking the last N desks in each room
-- (ordered by desk_number_in_room descending).

DROP TEMPORARY TABLE IF EXISTS tmp_fixed_desk_config;

CREATE TEMPORARY TABLE tmp_fixed_desk_config (
    building_name VARCHAR(255) NOT NULL,
    room_remark VARCHAR(255) NOT NULL,
    fixed_count INT NOT NULL,
    PRIMARY KEY (building_name, room_remark)
);

INSERT INTO tmp_fixed_desk_config (building_name, room_remark, fixed_count)
VALUES
    -- Building 1
    ('1 Bautznerstr. 19 a-b', 'Zimmer 1.1', 1),
    ('1 Bautznerstr. 19 a-b', 'Zimmer 1.2', 2),
    ('1 Bautznerstr. 19 a-b', 'Zimmer 1.3', 2),
    ('1 Bautznerstr. 19 a-b', 'Zimmer 1.4', 5),
    ('1 Bautznerstr. 19 a-b', 'Zimmer 1.5', 1),
    ('1 Bautznerstr. 19 a-b', 'Zimmer 1.6', 2),
    ('1 Bautznerstr. 19 a-b', 'Zimmer 2.1', 2),
    ('1 Bautznerstr. 19 a-b', 'Zimmer 2.2', 1),
    ('1 Bautznerstr. 19 a-b', 'Zimmer 2.3', 2),
    ('1 Bautznerstr. 19 a-b', 'Zimmer 2.4', 0),
    ('1 Bautznerstr. 19 a-b', 'Zimmer 2.5', 2),
    ('1 Bautznerstr. 19 a-b', 'Zimmer 2.6', 1),
    -- Building 2
    ('2 Bautznerstr. 19 c', 'Zimmer 1.1', 0),
    ('2 Bautznerstr. 19 c', 'Zimmer 1.2', 0),
    ('2 Bautznerstr. 19 c', 'Zimmer 2.1', 0),
    ('2 Bautznerstr. 19 c', 'Zimmer 2.2', 1),
    ('2 Bautznerstr. 19 c', 'Zimmer 2.3', 0),
    ('2 Bautznerstr. 19 c', 'Zimmer 2.4', 2),
    ('2 Bautznerstr. 19 c', 'Zimmer 2.5', 1),
    ('2 Bautznerstr. 19 c', 'Zimmer 2.6', 3),
    ('2 Bautznerstr. 19 c', 'Zimmer 3.1', 1),
    ('2 Bautznerstr. 19 c', 'Zimmer 3.2', 2),
    ('2 Bautznerstr. 19 c', 'Zimmer 3.3', 3),
    ('2 Bautznerstr. 19 c', 'Zimmer 3.4', 0),
    ('2 Bautznerstr. 19 c', 'Zimmer 3.5', 0),
    ('2 Bautznerstr. 19 c', 'Zimmer 3.6', 0),
    ('2 Bautznerstr. 19 c', 'Zimmer 3.7', 1),
    ('2 Bautznerstr. 19 c', 'Zimmer 3.8', 0),
    ('2 Bautznerstr. 19 c', 'Zimmer 3.9', 1),
    ('2 Bautznerstr. 19 c', 'Zimmer 4.1', 0),
    ('2 Bautznerstr. 19 c', 'Zimmer 4.2', 0);

-- 1) Reset fixed/hidden flags for all configured rooms.
UPDATE desks d
JOIN rooms r ON r.room_id = d.room_id
JOIN floors f ON f.floor_id = r.floor_id
JOIN buildings b ON b.building_id = f.building_id
JOIN tmp_fixed_desk_config cfg
    ON BINARY cfg.building_name = BINARY b.name
   AND BINARY cfg.room_remark = BINARY r.remark
SET d.is_fixed = 0,
    d.is_hidden = 0;

-- 2) Mark the last N desks as fixed for each configured room.
UPDATE desks d
JOIN (
    SELECT ranked.desk_id
    FROM (
        SELECT
            d2.desk_id,
            cfg.fixed_count,
            ROW_NUMBER() OVER (
                PARTITION BY b.name, r.remark
                ORDER BY COALESCE(d2.desk_number_in_room, 0) DESC, d2.desk_id DESC
            ) AS rn
        FROM desks d2
        JOIN rooms r ON r.room_id = d2.room_id
        JOIN floors f ON f.floor_id = r.floor_id
        JOIN buildings b ON b.building_id = f.building_id
        JOIN tmp_fixed_desk_config cfg
            ON BINARY cfg.building_name = BINARY b.name
           AND BINARY cfg.room_remark = BINARY r.remark
        WHERE cfg.fixed_count > 0
    ) ranked
    WHERE ranked.rn <= ranked.fixed_count
) selected_desks ON selected_desks.desk_id = d.desk_id
SET d.is_fixed = 1,
    d.is_hidden = 1;

DROP TEMPORARY TABLE IF EXISTS tmp_fixed_desk_config;
