-- normal user
insert into users (email,name,password,surname,visibility,default_floor_id,default_view_mode_id)
select 
    'test.user@mail.de', 
    'Max', 
    '$2a$10$Ur3L01HGEDVmroCR6QTi7OLbz0SZ9hQFvHg0KW25YvVIEXoLeiarK', 
    'Mustermann',
    0x1,
    (select floor_id from floors where floors.name='Musteretage 1'),
    (select view_mode_id from view_modes where view_modes.view_mode_name='day')
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE users.email = 'test.user@mail.de'
); 

insert into user_roles (user_id, role_id) 
select 
    (select id from users where users.email = 'test.user@mail.de'),
    (select id from roles where roles.name = 'ROLE_USER')
;

-- admin user
insert into users (email,name,password,surname,visibility,default_floor_id,default_view_mode_id)
select 
    'test.admin@mail.de', 
    'Maxi', 
    '$2a$10$Ur3L01HGEDVmroCR6QTi7OLbz0SZ9hQFvHg0KW25YvVIEXoLeiarK', 
    'Musterfrau',
    0x1,
    (select floor_id from floors where floors.name='Musteretage 2'),
    (select view_mode_id from view_modes where view_modes.view_mode_name='week')
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE users.email = 'test.admin@mail.de'
); 

insert into user_roles (user_id, role_id) 
select 
    (select id from users where users.email = 'test.admin@mail.de'),
    (select id from roles where roles.name = 'ROLE_ADMIN')
;