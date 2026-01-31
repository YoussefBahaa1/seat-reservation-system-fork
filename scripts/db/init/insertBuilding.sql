-- The building
INSERT INTO buildings (address,name,ordering,remark,town,used) 
SELECT 'Musterstraße 1','Mustergebäude', 1, 'Das Standardgebäude', 'Musterstadt', true
WHERE NOT EXISTS (
    SELECT 1 FROM buildings WHERE buildings.name = 'Mustergebäude'
);
-- The floors
INSERT into floors (name,name_of_img,ordering,remark,building_id)
select 'Musteretage 1', 'Musteretage1.png', 1, 'Erste Etage', (select building_id from buildings where buildings.name='Mustergebäude')
WHERE NOT EXISTS (
    SELECT 1 FROM floors WHERE floors.name = 'Musteretage 1'
); 

INSERT into floors (name,name_of_img,ordering,remark,building_id)
select 'Musteretage 2', 'Musteretage2.png', 2, 'Zweite Etage', (select building_id from buildings where buildings.name='Mustergebäude')
WHERE NOT EXISTS (
    SELECT 1 FROM floors WHERE floors.name = 'Musteretage 2'
); 

-- rooms

-- +---------+------------+----+----+----------+----------------+--------------+
-- | room_id | remark     | x  | y  | floor_id | room_status_id | room_type_id |
-- +---------+------------+----+----+----------+----------------+--------------+
-- |     481 | Zimmer 2.1 | 16 | 70 |       12 |              3 |            3 |
-- |     482 | Zimmer 2.2 | 16 | 28 |       12 |              3 |            3 |
-- |     483 | Zimmer 2.3 | 73 | 70 |       12 |              3 |            3 |
-- |     484 | Zimmer 1.2 | 15 | 28 |       11 |              3 |            3 |
-- |     485 | Zimmer 1.1 | 16 | 62 |       11 |              3 |            3 |

insert into rooms (remark, x, y, floor_id, room_status_id, room_type_id)
select 
    'Zimmer 1.1', 
    16, 
    62,
    (select floor_id from floors where floors.name='Musteretage 1'),
    (select room_status_id from room_statuses where room_statuses.room_status_name='enable'),
    (select room_type_id from room_types where room_types.room_type_name='normal')
where not exists(
    select 1 from rooms where rooms.remark='Zimmer 1.1'
);

insert into rooms (remark, x, y, floor_id, room_status_id, room_type_id)
select 
    'Zimmer 1.2', 
    15, 
    28,
    (select floor_id from floors where floors.name='Musteretage 1'),
    (select room_status_id from room_statuses where room_statuses.room_status_name='enable'),
    (select room_type_id from room_types where room_types.room_type_name='normal')
where not exists(
    select 1 from rooms where rooms.remark='Zimmer 1.2'
);

insert into rooms (remark, x, y, floor_id, room_status_id, room_type_id)
select 
    'Zimmer 2.3', 
    73, 
    70,
    (select floor_id from floors where floors.name='Musteretage 2'),
    (select room_status_id from room_statuses where room_statuses.room_status_name='enable'),
    (select room_type_id from room_types where room_types.room_type_name='normal')
where not exists(
    select 1 from rooms where rooms.remark='Zimmer 2.3'
);

insert into rooms (remark, x, y, floor_id, room_status_id, room_type_id)
select 
    'Zimmer 2.2', 
    16, 
    28,
    (select floor_id from floors where floors.name='Musteretage 2'),
    (select room_status_id from room_statuses where room_statuses.room_status_name='enable'),
    (select room_type_id from room_types where room_types.room_type_name='normal')
where not exists(
    select 1 from rooms where remark='Zimmer 2.2'
);

insert into rooms (remark, x, y, floor_id, room_status_id, room_type_id)
select 
    'Zimmer 2.1', 
    16, 
    70,
    (select floor_id from floors where floors.name='Musteretage 2'),
    (select room_status_id from room_statuses where room_statuses.room_status_name='enable'),
    (select room_type_id from room_types where room_types.room_type_name='normal')
where not exists(
    select 1 from rooms where remark='Zimmer 2.1'
);

-- Desks/Workstations
insert into desks (room_id, remark, desk_number_in_room, equipment_id)
select 
    (select room_id from rooms where remark='Zimmer 2.1'),
    'Arbeitsplatz 2.1.1',
    1,
    (select equipment_id from equipments where equipments.equipment_name='withEquipment')
where not exists(
    select 1 from desks where desks.remark='Arbeitsplatz 2.1.1'
);

insert into desks (room_id, remark, desk_number_in_room, equipment_id)
select 
    (select room_id from rooms where remark='Zimmer 2.1'),
    'Arbeitsplatz 2.1.2',
    2,
    (select equipment_id from equipments where equipments.equipment_name='withEquipment')
where not exists(
    select 1 from desks where desks.remark='Arbeitsplatz 2.1.2'
);

insert into desks (room_id, remark, desk_number_in_room, equipment_id)
select 
    (select room_id from rooms where remark='Zimmer 2.3'),
    'Arbeitsplatz 2.3.1',
    1,
    (select equipment_id from equipments where equipments.equipment_name='withEquipment')
where not exists(
    select 1 from desks where desks.remark='Arbeitsplatz 2.3.1'
);

insert into desks (room_id, remark, desk_number_in_room, equipment_id)
select 
    (select room_id from rooms where remark='Zimmer 1.2'),
    'Arbeitsplatz 1.2.1',
    1,
    (select equipment_id from equipments where equipments.equipment_name='withEquipment')
where not exists(
    select 1 from desks where desks.remark='Arbeitsplatz 1.2.1'
);

insert into desks (room_id, remark, desk_number_in_room, equipment_id)
select 
    (select room_id from rooms where rooms.remark='Zimmer 1.1'),
    'Arbeitsplatz 1.1.1',
    1,
    (select equipment_id from equipments where equipments.equipment_name='withEquipment')
where not exists(
    select 1 from desks where desks.remark='Arbeitsplatz 1.1.1'
);

insert into desks (room_id, remark, desk_number_in_room, equipment_id)
select 
    (select room_id from rooms where rooms.remark='Zimmer 1.1'),
    'Arbeitsplatz 1.1.2',
    1,
    (select equipment_id from equipments where equipments.equipment_name='withEquipment')
where not exists(
    select 1 from desks where desks.remark='Arbeitsplatz 1.1.2'
);


