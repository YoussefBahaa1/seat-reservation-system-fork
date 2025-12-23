--insert into view_modes('view_mode_name') values('day');
--insert into view_modes('view_mode_name') values('week');
--insert into view_modes('view_mode_name') values('month');

INSERT INTO view_modes (view_mode_name)
SELECT 'day'
FROM dual
WHERE NOT EXISTS (
    SELECT 1
    FROM view_modes
    WHERE view_mode_name = 'day'
);
INSERT INTO view_modes (view_mode_name)
SELECT 'day'
FROM dual
WHERE NOT EXISTS (
    SELECT 1
    FROM view_modes
    WHERE view_mode_name = 'day'
);
INSERT INTO view_modes (view_mode_name)
SELECT 'week'
FROM dual
WHERE NOT EXISTS (
    SELECT 1
    FROM view_modes
    WHERE view_mode_name = 'week'
);
INSERT INTO view_modes (view_mode_name)
SELECT 'month'
FROM dual
WHERE NOT EXISTS (
    SELECT 1
    FROM view_modes
    WHERE view_mode_name = 'month'
);