SET FOREIGN_KEY_CHECKS=0;
drop table view_modes;
ALTER TABLE users DROP COLUMN default_view_mode_id;
ALTER TABLE users DROP COLUMN  default_floor_id;
SET FOREIGN_KEY_CHECKS=1;