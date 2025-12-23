-- The amount of days defines how old the rest of the bookings and series are.
-- Every booking/series that is older then n days from today is deleted.
SET @n := 28;

SELECT CONCAT('Delete bookings/series older than ', @n, ' days');
select count(*) as "cnt bookings before delete" from bookings where bookings.day < NOW() - INTERVAL @n DAY;
delete from bookings where day < NOW() - INTERVAL @n DAY;
select count(*) as "cnt bookings after delete" from bookings where bookings.day < NOW() - INTERVAL @n DAY;

select count(*) as "cnt series before delete" from series where series.end_Date < NOW() - INTERVAL @n DAY;
delete from series where end_Date < NOW() - INTERVAL @n DAY;
select count(*) as "cnt series after delete" from series where series.end_Date < NOW() - INTERVAL @n DAY;