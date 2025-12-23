INSERT INTO room_types (room_type_name)
SELECT 'normal'
WHERE NOT EXISTS (
    SELECT 1 FROM room_types WHERE room_type_name = 'normal'
);

INSERT INTO room_types (room_type_name)
SELECT 'silence'
WHERE NOT EXISTS (
    SELECT 1 FROM room_types WHERE room_type_name = 'silence'
);