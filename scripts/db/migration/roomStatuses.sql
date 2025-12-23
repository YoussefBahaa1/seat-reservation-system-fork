-- Check that collate matches with the col of the other table.
-- Check with SHOW TABLE STATUS LIKE 'rooms'\G

insert into room_statuses (room_status_name) 
select 'enable' COLLATE utf8mb4_general_ci
where not exists (
    select 1 from room_statuses where room_status_name = 'enable' COLLATE utf8mb4_general_ci
);

insert into room_statuses (room_status_name) 
select 'disable' COLLATE utf8mb4_general_ci
where not exists (
    select 1 from room_statuses where room_status_name = 'disable' COLLATE utf8mb4_general_ci
);

update rooms set room_status_id=(
    select room_status_id 
    from room_statuses
    where room_status_name=status
    );

select * from rooms;

alter table rooms drop column IF EXISTS status;

select * from rooms;
select * from rooms where room_status_id is null;