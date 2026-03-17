-- Override monitor count for specific seeded rooms.
-- Building 2, EG, Zimmer 1.1 and Zimmer 1.2 => 2 monitors.

UPDATE desks d
JOIN rooms r ON r.room_id = d.room_id
JOIN floors f ON f.floor_id = r.floor_id
JOIN buildings b ON b.building_id = f.building_id
SET d.monitors_quantity = 2
WHERE BINARY b.name = BINARY '2 Bautznerstr. 19 c'
  AND BINARY f.name = BINARY 'EG'
  AND BINARY r.remark IN (BINARY 'Zimmer 1.1', BINARY 'Zimmer 1.2');
