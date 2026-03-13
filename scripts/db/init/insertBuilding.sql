-- The building
INSERT INTO buildings (address,name,ordering,remark,town,used) 
SELECT 'Musterstraße 1','1 Bautznerstr. 19 a-b', 1, 'Das Standardgebäude', 'Musterstadt', true
WHERE NOT EXISTS (
    SELECT 1 FROM buildings WHERE buildings.name = '1 Bautznerstr. 19 a-b'
);
-- The floors
INSERT into floors (name,name_of_img,ordering,remark,building_id)
select 'EG', '1-eg.png', 1, 'Erste Etage', (select building_id from buildings where buildings.name='1 Bautznerstr. 19 a-b')
WHERE NOT EXISTS (
    SELECT 1 FROM floors WHERE floors.name = 'EG'
); 

INSERT into floors (name,name_of_img,ordering,remark,building_id)
select '1. OG', '1-1.png', 2, 'Zweite Etage', (select building_id from buildings where buildings.name='1 Bautznerstr. 19 a-b')
WHERE NOT EXISTS (
    SELECT 1 FROM floors WHERE floors.name = '1. OG'
); 

-- Keep image references in sync even if floors already exist.
update floors f
join buildings b on b.building_id = f.building_id
set f.name_of_img = '1-eg.png'
where b.name = '1 Bautznerstr. 19 a-b' and f.name = 'EG';

update floors f
join buildings b on b.building_id = f.building_id
set f.name_of_img = '1-1.png'
where b.name = '1 Bautznerstr. 19 a-b' and f.name = '1. OG';

-- rooms
-- Remove existing sample rooms/desks for these room names so coordinates and desk counts are replaced.
delete d
from desks d
join rooms r on r.room_id = d.room_id
join floors f on f.floor_id = r.floor_id
join buildings b on b.building_id = f.building_id
where b.name = '1 Bautznerstr. 19 a-b'
  and r.remark in (
      'Zimmer 1.1', 'Zimmer 1.2', 'Zimmer 1.3', 'Zimmer 1.4', 'Zimmer 1.5', 'Zimmer 1.6',
      'Zimmer 2.1', 'Zimmer 2.2', 'Zimmer 2.3', 'Zimmer 2.4', 'Zimmer 2.5', 'Zimmer 2.6'
  );

delete r
from rooms r
join floors f on f.floor_id = r.floor_id
join buildings b on b.building_id = f.building_id
where b.name = '1 Bautznerstr. 19 a-b'
  and r.remark in (
      'Zimmer 1.1', 'Zimmer 1.2', 'Zimmer 1.3', 'Zimmer 1.4', 'Zimmer 1.5', 'Zimmer 1.6',
      'Zimmer 2.1', 'Zimmer 2.2', 'Zimmer 2.3', 'Zimmer 2.4', 'Zimmer 2.5', 'Zimmer 2.6'
  );

insert into rooms (remark, x, y, floor_id, room_status_id, room_type_id)
select
    new_rooms.remark,
    new_rooms.x,
    new_rooms.y,
    f.floor_id,
    rs.room_status_id,
    rt.room_type_id
from (
    select 'Zimmer 1.1' as remark, 10 as x, 5 as y, 'EG' as floor_name
    union all select 'Zimmer 1.2', 5, 32, 'EG'
    union all select 'Zimmer 1.3', 52, 72, 'EG'
    union all select 'Zimmer 1.4', 62, 72, 'EG'
    union all select 'Zimmer 1.5', 83, 90, 'EG'
    union all select 'Zimmer 1.6', 81, 20, 'EG'
    union all select 'Zimmer 2.1', 6, 71, '1. OG'
    union all select 'Zimmer 2.2', 33, 70, '1. OG'
    union all select 'Zimmer 2.3', 46, 70, '1. OG'
    union all select 'Zimmer 2.4', 58, 70, '1. OG'
    union all select 'Zimmer 2.5', 64, 90, '1. OG'
    union all select 'Zimmer 2.6', 72, 90, '1. OG'
) as new_rooms
join buildings b on b.name = '1 Bautznerstr. 19 a-b'
join floors f on f.building_id = b.building_id and f.name = new_rooms.floor_name
join room_statuses rs on rs.room_status_name = 'enable'
join room_types rt on rt.room_type_name = 'normal'
where not exists (
    select 1
    from rooms existing_room
    join floors existing_floor on existing_floor.floor_id = existing_room.floor_id
    join buildings existing_building on existing_building.building_id = existing_floor.building_id
    where existing_building.name = '1 Bautznerstr. 19 a-b'
      and existing_room.remark = new_rooms.remark
);

-- Desks/Workstations
insert into desks (room_id, remark, desk_number_in_room)
select
    r.room_id,
    new_desks.remark,
    new_desks.desk_number_in_room
from (
    select 'Zimmer 1.1' as room_remark, 'Arbeitsplatz 1.1.1' as remark, 1 as desk_number_in_room
    union all select 'Zimmer 1.1', 'Arbeitsplatz 1.1.2', 2
    union all select 'Zimmer 1.2', 'Arbeitsplatz 1.2.1', 1
    union all select 'Zimmer 1.2', 'Arbeitsplatz 1.2.2', 2
    union all select 'Zimmer 1.2', 'Arbeitsplatz 1.2.3', 3
    union all select 'Zimmer 1.3', 'Arbeitsplatz 1.3.1', 1
    union all select 'Zimmer 1.3', 'Arbeitsplatz 1.3.2', 2
    union all select 'Zimmer 1.3', 'Arbeitsplatz 1.3.3', 3
    union all select 'Zimmer 1.4', 'Arbeitsplatz 1.4.1', 1
    union all select 'Zimmer 1.4', 'Arbeitsplatz 1.4.2', 2
    union all select 'Zimmer 1.4', 'Arbeitsplatz 1.4.3', 3
    union all select 'Zimmer 1.4', 'Arbeitsplatz 1.4.4', 4
    union all select 'Zimmer 1.4', 'Arbeitsplatz 1.4.5', 5
    union all select 'Zimmer 1.4', 'Arbeitsplatz 1.4.6', 6
    union all select 'Zimmer 1.4', 'Arbeitsplatz 1.4.7', 7
    union all select 'Zimmer 1.4', 'Arbeitsplatz 1.4.8', 8
    union all select 'Zimmer 1.5', 'Arbeitsplatz 1.5.1', 1
    union all select 'Zimmer 1.5', 'Arbeitsplatz 1.5.2', 2
    union all select 'Zimmer 1.6', 'Arbeitsplatz 1.6.1', 1
    union all select 'Zimmer 1.6', 'Arbeitsplatz 1.6.2', 2
    union all select 'Zimmer 1.6', 'Arbeitsplatz 1.6.3', 3
    union all select 'Zimmer 2.1', 'Arbeitsplatz 2.1.1', 1
    union all select 'Zimmer 2.1', 'Arbeitsplatz 2.1.2', 2
    union all select 'Zimmer 2.1', 'Arbeitsplatz 2.1.3', 3
    union all select 'Zimmer 2.2', 'Arbeitsplatz 2.2.1', 1
    union all select 'Zimmer 2.2', 'Arbeitsplatz 2.2.2', 2
    union all select 'Zimmer 2.2', 'Arbeitsplatz 2.2.3', 3
    union all select 'Zimmer 2.3', 'Arbeitsplatz 2.3.1', 1
    union all select 'Zimmer 2.3', 'Arbeitsplatz 2.3.2', 2
    union all select 'Zimmer 2.3', 'Arbeitsplatz 2.3.3', 3
    union all select 'Zimmer 2.4', 'Arbeitsplatz 2.4.1', 1
    union all select 'Zimmer 2.5', 'Arbeitsplatz 2.5.1', 1
    union all select 'Zimmer 2.5', 'Arbeitsplatz 2.5.2', 2
    union all select 'Zimmer 2.5', 'Arbeitsplatz 2.5.3', 3
    union all select 'Zimmer 2.5', 'Arbeitsplatz 2.5.4', 4
    union all select 'Zimmer 2.6', 'Arbeitsplatz 2.6.1', 1
    union all select 'Zimmer 2.6', 'Arbeitsplatz 2.6.2', 2
    union all select 'Zimmer 2.6', 'Arbeitsplatz 2.6.3', 3
) as new_desks
join rooms r on r.remark = new_desks.room_remark
join floors f on f.floor_id = r.floor_id
join buildings b on b.building_id = f.building_id and b.name = '1 Bautznerstr. 19 a-b'
where not exists (
    select 1
    from desks existing_desk
    join rooms existing_room on existing_room.room_id = existing_desk.room_id
    join floors existing_floor on existing_floor.floor_id = existing_room.floor_id
    join buildings existing_building on existing_building.building_id = existing_floor.building_id
    where existing_building.name = '1 Bautznerstr. 19 a-b'
      and existing_desk.remark = new_desks.remark
);

-- The second building
INSERT INTO buildings (address,name,ordering,remark,town,used)
SELECT 'Musterstraße 2','2 Bautznerstr. 19 c', 2, 'Zweites Gebaeude', 'Musterstadt', true
WHERE NOT EXISTS (
    SELECT 1 FROM buildings WHERE buildings.name = '2 Bautznerstr. 19 c'
);

-- Floors for second building
INSERT into floors (name,name_of_img,ordering,remark,building_id)
select 'EG', '2-eg.png', 1, 'Erdgeschoss', (select building_id from buildings where buildings.name='2 Bautznerstr. 19 c')
WHERE NOT EXISTS (
    SELECT 1
    FROM floors f
    JOIN buildings b ON b.building_id = f.building_id
    WHERE b.name = '2 Bautznerstr. 19 c' AND f.name = 'EG'
);

INSERT into floors (name,name_of_img,ordering,remark,building_id)
select '1. OG', '2-1.png', 2, '1. Obergeschoss', (select building_id from buildings where buildings.name='2 Bautznerstr. 19 c')
WHERE NOT EXISTS (
    SELECT 1
    FROM floors f
    JOIN buildings b ON b.building_id = f.building_id
    WHERE b.name = '2 Bautznerstr. 19 c' AND f.name = '1. OG'
);

INSERT into floors (name,name_of_img,ordering,remark,building_id)
select '2. OG', '2-2.png', 3, '2. Obergeschoss', (select building_id from buildings where buildings.name='2 Bautznerstr. 19 c')
WHERE NOT EXISTS (
    SELECT 1
    FROM floors f
    JOIN buildings b ON b.building_id = f.building_id
    WHERE b.name = '2 Bautznerstr. 19 c' AND f.name = '2. OG'
);

INSERT into floors (name,name_of_img,ordering,remark,building_id)
select '3. OG', '2-3.png', 4, '3. Obergeschoss', (select building_id from buildings where buildings.name='2 Bautznerstr. 19 c')
WHERE NOT EXISTS (
    SELECT 1
    FROM floors f
    JOIN buildings b ON b.building_id = f.building_id
    WHERE b.name = '2 Bautznerstr. 19 c' AND f.name = '3. OG'
);

-- Keep image references in sync even if floors already exist.
update floors f
join buildings b on b.building_id = f.building_id
set f.name_of_img = '2-eg.png'
where b.name = '2 Bautznerstr. 19 c' and f.name = 'EG';

update floors f
join buildings b on b.building_id = f.building_id
set f.name_of_img = '2-1.png'
where b.name = '2 Bautznerstr. 19 c' and f.name = '1. OG';

update floors f
join buildings b on b.building_id = f.building_id
set f.name_of_img = '2-2.png'
where b.name = '2 Bautznerstr. 19 c' and f.name = '2. OG';

update floors f
join buildings b on b.building_id = f.building_id
set f.name_of_img = '2-3.png'
where b.name = '2 Bautznerstr. 19 c' and f.name = '3. OG';

-- rooms for second building
delete d
from desks d
join rooms r on r.room_id = d.room_id
join floors f on f.floor_id = r.floor_id
join buildings b on b.building_id = f.building_id
where b.name = '2 Bautznerstr. 19 c'
  and r.remark in (
      'Zimmer 1.1', 'Zimmer 1.2',
      'Zimmer 2.1', 'Zimmer 2.2', 'Zimmer 2.3', 'Zimmer 2.4', 'Zimmer 2.5', 'Zimmer 2.6',
      'Zimmer 3.1', 'Zimmer 3.2', 'Zimmer 3.3', 'Zimmer 3.4', 'Zimmer 3.5', 'Zimmer 3.6', 'Zimmer 3.7', 'Zimmer 3.8', 'Zimmer 3.9',
      'Zimmer 4.1', 'Zimmer 4.2'
  );

delete r
from rooms r
join floors f on f.floor_id = r.floor_id
join buildings b on b.building_id = f.building_id
where b.name = '2 Bautznerstr. 19 c'
  and r.remark in (
      'Zimmer 1.1', 'Zimmer 1.2',
      'Zimmer 2.1', 'Zimmer 2.2', 'Zimmer 2.3', 'Zimmer 2.4', 'Zimmer 2.5', 'Zimmer 2.6',
      'Zimmer 3.1', 'Zimmer 3.2', 'Zimmer 3.3', 'Zimmer 3.4', 'Zimmer 3.5', 'Zimmer 3.6', 'Zimmer 3.7', 'Zimmer 3.8', 'Zimmer 3.9',
      'Zimmer 4.1', 'Zimmer 4.2'
  );

insert into rooms (remark, x, y, floor_id, room_status_id, room_type_id)
select
    new_rooms.remark,
    new_rooms.x,
    new_rooms.y,
    f.floor_id,
    rs.room_status_id,
    rt.room_type_id
from (
    select 'Zimmer 1.1' as remark, 8 as x, 23 as y, 'EG' as floor_name
    union all select 'Zimmer 1.2', 59, 17, 'EG'
    union all select 'Zimmer 2.1', 14, 11, '1. OG'
    union all select 'Zimmer 2.2', 29, 18, '1. OG'
    union all select 'Zimmer 2.3', 51, 17, '1. OG'
    union all select 'Zimmer 2.4', 82, 24, '1. OG'
    union all select 'Zimmer 2.5', 8, 32, '1. OG'
    union all select 'Zimmer 2.6', 64, 60, '1. OG'
    union all select 'Zimmer 3.1', 36, 16, '2. OG'
    union all select 'Zimmer 3.2', 59, 17, '2. OG'
    union all select 'Zimmer 3.3', 84, 19, '2. OG'
    union all select 'Zimmer 3.4', 8, 45, '2. OG'
    union all select 'Zimmer 3.5', 8, 63, '2. OG'
    union all select 'Zimmer 3.6', 49, 59, '2. OG'
    union all select 'Zimmer 3.7', 62, 59, '2. OG'
    union all select 'Zimmer 3.8', 75, 59, '2. OG'
    union all select 'Zimmer 3.9', 87, 59, '2. OG'
    union all select 'Zimmer 4.1', 20, 20, '3. OG'
    union all select 'Zimmer 4.2', 49, 59, '3. OG'
) as new_rooms
join buildings b on b.name = '2 Bautznerstr. 19 c'
join floors f on f.building_id = b.building_id and f.name = new_rooms.floor_name
join room_statuses rs on rs.room_status_name = 'enable'
join room_types rt on rt.room_type_name = 'normal'
where not exists (
    select 1
    from rooms existing_room
    join floors existing_floor on existing_floor.floor_id = existing_room.floor_id
    join buildings existing_building on existing_building.building_id = existing_floor.building_id
    where existing_building.name = '2 Bautznerstr. 19 c'
      and existing_room.remark = new_rooms.remark
);

insert into desks (room_id, remark, desk_number_in_room)
select
    r.room_id,
    new_desks.remark,
    new_desks.desk_number_in_room
from (
    select 'Zimmer 1.1' as room_remark, 'Arbeitsplatz 1.1.1' as remark, 1 as desk_number_in_room
    union all select 'Zimmer 1.2', 'Arbeitsplatz 1.2.1', 1
    union all select 'Zimmer 2.1', 'Arbeitsplatz 2.1.1', 1
    union all select 'Zimmer 2.1', 'Arbeitsplatz 2.1.2', 2
    union all select 'Zimmer 2.2', 'Arbeitsplatz 2.2.1', 1
    union all select 'Zimmer 2.2', 'Arbeitsplatz 2.2.2', 2
    union all select 'Zimmer 2.3', 'Arbeitsplatz 2.3.1', 1
    union all select 'Zimmer 2.3', 'Arbeitsplatz 2.3.2', 2
    union all select 'Zimmer 2.3', 'Arbeitsplatz 2.3.3', 3
    union all select 'Zimmer 2.3', 'Arbeitsplatz 2.3.4', 4
    union all select 'Zimmer 2.4', 'Arbeitsplatz 2.4.1', 1
    union all select 'Zimmer 2.4', 'Arbeitsplatz 2.4.2', 2
    union all select 'Zimmer 2.4', 'Arbeitsplatz 2.4.3', 3
    union all select 'Zimmer 2.5', 'Arbeitsplatz 2.5.1', 1
    union all select 'Zimmer 2.5', 'Arbeitsplatz 2.5.2', 2
    union all select 'Zimmer 2.6', 'Arbeitsplatz 2.6.1', 1
    union all select 'Zimmer 2.6', 'Arbeitsplatz 2.6.2', 2
    union all select 'Zimmer 2.6', 'Arbeitsplatz 2.6.3', 3
    union all select 'Zimmer 2.6', 'Arbeitsplatz 2.6.4', 4
    union all select 'Zimmer 2.6', 'Arbeitsplatz 2.6.5', 5
    union all select 'Zimmer 3.1', 'Arbeitsplatz 3.1.1', 1
    union all select 'Zimmer 3.1', 'Arbeitsplatz 3.1.2', 2
    union all select 'Zimmer 3.2', 'Arbeitsplatz 3.2.1', 1
    union all select 'Zimmer 3.2', 'Arbeitsplatz 3.2.2', 2
    union all select 'Zimmer 3.2', 'Arbeitsplatz 3.2.3', 3
    union all select 'Zimmer 3.3', 'Arbeitsplatz 3.3.1', 1
    union all select 'Zimmer 3.3', 'Arbeitsplatz 3.3.2', 2
    union all select 'Zimmer 3.3', 'Arbeitsplatz 3.3.3', 3
    union all select 'Zimmer 3.3', 'Arbeitsplatz 3.3.4', 4
    union all select 'Zimmer 3.4', 'Arbeitsplatz 3.4.1', 1
    union all select 'Zimmer 3.4', 'Arbeitsplatz 3.4.2', 2
    union all select 'Zimmer 3.5', 'Arbeitsplatz 3.5.1', 1
    union all select 'Zimmer 3.6', 'Arbeitsplatz 3.6.1', 1
    union all select 'Zimmer 3.6', 'Arbeitsplatz 3.6.2', 2
    union all select 'Zimmer 3.6', 'Arbeitsplatz 3.6.3', 3
    union all select 'Zimmer 3.7', 'Arbeitsplatz 3.7.1', 1
    union all select 'Zimmer 3.7', 'Arbeitsplatz 3.7.2', 2
    union all select 'Zimmer 3.8', 'Arbeitsplatz 3.8.1', 1
    union all select 'Zimmer 3.8', 'Arbeitsplatz 3.8.2', 2
    union all select 'Zimmer 3.8', 'Arbeitsplatz 3.8.3', 3
    union all select 'Zimmer 3.9', 'Arbeitsplatz 3.9.1', 1
    union all select 'Zimmer 3.9', 'Arbeitsplatz 3.9.2', 2
    union all select 'Zimmer 4.1', 'Arbeitsplatz 4.1.1', 1
    union all select 'Zimmer 4.1', 'Arbeitsplatz 4.1.2', 2
    union all select 'Zimmer 4.1', 'Arbeitsplatz 4.1.3', 3
    union all select 'Zimmer 4.2', 'Arbeitsplatz 4.2.1', 1
    union all select 'Zimmer 4.2', 'Arbeitsplatz 4.2.2', 2
) as new_desks
join rooms r on r.remark = new_desks.room_remark
join floors f on f.floor_id = r.floor_id
join buildings b on b.building_id = f.building_id and b.name = '2 Bautznerstr. 19 c'
where not exists (
    select 1
    from desks existing_desk
    join rooms existing_room on existing_room.room_id = existing_desk.room_id
    join floors existing_floor on existing_floor.floor_id = existing_room.floor_id
    join buildings existing_building on existing_building.building_id = existing_floor.building_id
    where existing_building.name = '2 Bautznerstr. 19 c'
      and existing_desk.remark = new_desks.remark
);
