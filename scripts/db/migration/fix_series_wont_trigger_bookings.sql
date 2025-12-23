-- Fixes the bug that after some time series bookings wont trigger the creations of bookings.
insert into bookings (begin, booking_in_progress, day, end, lock_expiry_time, desk_id, room_id, user_id, series_id)
select 
    start_time,
    0,
    calculated_date,
    end_time,
    NULL,
    desk_id,
    room_id,
    user_id,
    series_id
from (
    SELECT 
        users_series.email,
        s.series_id as series_id,
        d.desk_id as desk_id,
        d.remark as desk_remark,
        rooms.remark as room_remark,
        floors.name as floor_name,
        buildings.name as building_name,
        d.room_id as room_id,
        s.start_date as start_date,
        s.start_time as start_time,
        s.end_date as end_date,
        s.end_time as end_time,
        s.day_of_the_week as day_of_the_week,
        DATE(DATE_ADD(s.start_date, INTERVAL n DAY)) AS calculated_date,
        users_series.id as user_id
    FROM series s
    JOIN users users_series ON s.user_id = users_series.id
    JOIN desks d ON s.desk_id = d.desk_id
    join rooms on rooms.room_id=d.room_id
    join floors on floors.floor_id=rooms.floor_id
    join buildings on floors.building_id=buildings.building_id
    CROSS JOIN (
        SELECT (t*100 + u*10 + v) AS n
        FROM 
            (SELECT 0 t UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) t,
            (SELECT 0 u UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) u,
            (SELECT 0 v UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) v
    ) numbers
    WHERE 
        DATE_ADD(s.start_date, INTERVAL n DAY) <= s.end_date
        AND WEEKDAY(DATE_ADD(s.start_date, INTERVAL n DAY)) = s.day_of_the_week
    ORDER BY s.series_id, calculated_date
) as x order by x.series_id;