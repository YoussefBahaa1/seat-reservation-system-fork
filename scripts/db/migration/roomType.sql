select * from rooms;
--update rooms set room_type_id=1;
update rooms set room_type_id=(
    select room_type_id from room_types where lower(rooms.type)=lower(room_type_name)
);
alter table rooms drop column building;
alter table rooms drop column floor;
alter table rooms drop column type; 
