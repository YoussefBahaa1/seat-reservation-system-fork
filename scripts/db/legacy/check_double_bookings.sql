-- Shows where a collision between an booking by an series and by an normal booking occurs.

SELECT 
	series.series_id,
	bookings.booking_id,	
	series.start_date,
	series.end_date,
	desks.remark, 
	users_series.email as "users_series.email", 
	bookings.day,
	users_bookings.email as "users_bookings.email" 
from series 
join users as users_series on series.user_id=users_series.id
join desks on 	series.desk_id=desks.desk_id	
join bookings on desks.desk_id=bookings.desk_id
join users as users_bookings on bookings.user_id=users_bookings.id
where
	bookings.series_id is NULL
    and users_bookings.id != users_series.id
	and bookings.day > '2025-12-10'
	and bookings.day in (
		select 
			DATE(DATE_ADD(series.start_date, INTERVAL n DAY)) AS calculated_date 
		FROM (  
			SELECT (t*100 + u*10 + v) AS n 
			FROM  
				(SELECT 0 t UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) t, 
				(SELECT 0 u UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) u, 
				(SELECT 0 v UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) v 
			) numbers
		WHERE DATE_ADD(series.start_date, INTERVAL n DAY) <= series.end_date
		AND WEEKDAY(DATE_ADD(series.start_date, INTERVAL n DAY)) = series.day_of_the_week
	)
order by bookings.day;