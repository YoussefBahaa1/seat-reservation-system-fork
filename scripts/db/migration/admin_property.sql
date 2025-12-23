-- Run this script to make sure, that every user that has the admin flag set is actual an admin in sense of db logic.
-- We do this to make the admin flag obsolete to avoid redundancies.
select 
    users.email,
    roles.name
from users 
join user_roles on user_roles.user_id=users.id
join roles on roles.id=user_roles.role_id
where users.admin=True;

update user_roles 
set role_id=(select id from roles where name='ROLE_ADMIN')
where user_id in (select id from users where admin=True)
;

select 
    users.email,
    roles.name
from users 
join user_roles on user_roles.user_id=users.id
join roles on roles.id=user_roles.role_id
where users.admin=True;

-- After all changes in the source execute the following line
--ALTER TABLE nutzer DROP COLUMN admin;
