-- Check that collate matches with the col of the other table.
-- Check with SHOW TABLE STATUS LIKE 'rooms'\G

insert into equipments (equipment_name) 
select 'withEquipment' COLLATE utf8mb4_general_ci
where not exists (
    select 1 from equipments where equipment_name = 'withEquipment' COLLATE utf8mb4_general_ci
);

insert into equipments (equipment_name) 
select 'withoutEquipment' COLLATE utf8mb4_general_ci
where not exists (
    select 1 from equipments where equipment_name = 'withoutEquipment' COLLATE utf8mb4_general_ci
);

insert into equipments (equipment_name) 
select 'unknown' COLLATE utf8mb4_general_ci
where not exists (
    select 1 from equipments where equipment_name = 'unknown' COLLATE utf8mb4_general_ci
);

update desks set equipment_id = (
    select equipment_id 
    from equipments 
    where equipment_name='withEquipment'
)
where equipment = 'with equipment';

update desks set equipment_id = (
    select equipment_id 
    from equipments 
    where equipment_name='withoutEquipment'
)
where equipment = 'without equipment';

update desks set equipment_id = (
    select equipment_id 
    from equipments 
    where equipment_name='unknown'
)
where equipment is NULL or equipment='';

alter table desks drop column IF EXISTS equipment;
-- select * from rooms;

-- alter table rooms drop column IF EXISTS status;

-- select * from rooms;
-- select * from rooms where room_status_id is null;