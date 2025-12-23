-- add the view modes
INSERT INTO view_modes (view_mode_name)
SELECT 'day'
WHERE NOT EXISTS (
    SELECT 1 FROM view_modes WHERE view_mode_name = 'day'
);
INSERT INTO view_modes (view_mode_name)
SELECT 'week'
WHERE NOT EXISTS (
    SELECT 1 FROM view_modes WHERE view_mode_name = 'week'
);
INSERT INTO view_modes (view_mode_name)
SELECT 'month'
WHERE NOT EXISTS (
    SELECT 1 FROM view_modes WHERE view_mode_name = 'month'
);