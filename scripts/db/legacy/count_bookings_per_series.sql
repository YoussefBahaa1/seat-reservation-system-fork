-- Count the bookings of each series. 

select 
	series.series_id, 
	series.start_time,
	series.end_time,
	users.email,
	desks.remark,
	rooms.remark,
	floors.name,
	buildings.name,
	start_date, 
	end_date, 
	day_of_the_week,
	frequency,
	count(booking_id)
from series
join users on series.user_id=users.id
join bookings on bookings.series_id=series.series_id
join desks on series.desk_id = desks.desk_id
join rooms on desks.room_id = rooms.room_id
join floors on floors.floor_id = rooms.floor_id
join buildings on buildings.building_id = floors.building_id
group by series.series_id
order by count(booking_id) asc;
;