-- Shows where bookings from differen users collide.
select 
	b1.booking_id, 
	b2.booking_id,
	b1_users.email,
	b2_users.email,
	b1.series_id, 
	b2.series_id,
	b1.day,
	desks.remark,
	rooms.remark,
	floors.name,
	buildings.name
from bookings b1
join bookings b2 on b1.desk_id=b2.desk_id and b1.day=b2.day 
and b1.user_id!=b2.user_id
join users b1_users on b1_users.id=b1.user_id 
join users b2_users on b2_users.id=b2.user_id 
join desks on 	b1.desk_id=desks.desk_id
join rooms on desks.room_id=rooms.room_id
join floors on rooms.floor_id = floors.floor_id
join buildings on floors.building_id=buildings.building_id
where 
	b1.day > '2025-12-10'
	and (
		b1.begin BETWEEN b2.begin and b2.end
		or b1.end BETWEEN b2.begin and b2.end
		or b2.begin BETWEEN b1.begin and b1.end
		or b2.end BETWEEN b1.begin and b1.end
	)
;