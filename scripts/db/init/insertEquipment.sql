-- Check that collate matches with the col of the other table.

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