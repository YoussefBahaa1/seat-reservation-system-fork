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
-- Remove existing sample rooms/desks for these room names so coordinates and desk counts are replaced.
delete d
from desks d
join rooms r on r.room_id = d.room_id
join floors f on f.floor_id = r.floor_id
join buildings b on b.building_id = f.building_id
where b.name = 'Mustergebäude'
  and r.remark in (
      'Zimmer 1.1', 'Zimmer 1.2', 'Zimmer 1.3', 'Zimmer 1.4', 'Zimmer 1.5', 'Zimmer 1.6',
      'Zimmer 2.1', 'Zimmer 2.2', 'Zimmer 2.3', 'Zimmer 2.4', 'Zimmer 2.5', 'Zimmer 2.6'
  );

delete r
from rooms r
join floors f on f.floor_id = r.floor_id
join buildings b on b.building_id = f.building_id
where b.name = 'Mustergebäude'
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
    select 'Zimmer 1.1' as remark, 9 as x, 5 as y, 'Musteretage 1' as floor_name
    union all select 'Zimmer 1.2', 4, 32, 'Musteretage 1'
    union all select 'Zimmer 1.3', 52, 72, 'Musteretage 1'
    union all select 'Zimmer 1.4', 62, 72, 'Musteretage 1'
    union all select 'Zimmer 1.5', 83, 91, 'Musteretage 1'
    union all select 'Zimmer 1.6', 81, 20, 'Musteretage 1'
    union all select 'Zimmer 2.1', 6, 71, 'Musteretage 2'
    union all select 'Zimmer 2.2', 33, 70, 'Musteretage 2'
    union all select 'Zimmer 2.3', 46, 70, 'Musteretage 2'
    union all select 'Zimmer 2.4', 58, 70, 'Musteretage 2'
    union all select 'Zimmer 2.5', 63, 90, 'Musteretage 2'
    union all select 'Zimmer 2.6', 72, 90, 'Musteretage 2'
) as new_rooms
join buildings b on b.name = 'Mustergebäude'
join floors f on f.building_id = b.building_id and f.name = new_rooms.floor_name
join room_statuses rs on rs.room_status_name = 'enable'
join room_types rt on rt.room_type_name = 'normal'
where not exists (
    select 1
    from rooms existing_room
    join floors existing_floor on existing_floor.floor_id = existing_room.floor_id
    join buildings existing_building on existing_building.building_id = existing_floor.building_id
    where existing_building.name = 'Mustergebäude'
      and existing_room.remark = new_rooms.remark
);

-- Desks/Workstations
insert into desks (room_id, remark, desk_number_in_room, equipment_id)
select
    r.room_id,
    new_desks.remark,
    new_desks.desk_number_in_room,
    e.equipment_id
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
join buildings b on b.building_id = f.building_id and b.name = 'Mustergebäude'
join equipments e on e.equipment_name = 'withEquipment'
where not exists (
    select 1
    from desks existing_desk
    join rooms existing_room on existing_room.room_id = existing_desk.room_id
    join floors existing_floor on existing_floor.floor_id = existing_room.floor_id
    join buildings existing_building on existing_building.building_id = existing_floor.building_id
    where existing_building.name = 'Mustergebäude'
      and existing_desk.remark = new_desks.remark
);
