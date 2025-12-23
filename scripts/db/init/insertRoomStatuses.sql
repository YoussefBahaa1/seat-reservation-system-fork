-- Check that collate matches with the col of the other table.

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