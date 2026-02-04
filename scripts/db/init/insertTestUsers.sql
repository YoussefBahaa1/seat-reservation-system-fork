-- Test password hash for "test": $2a$10$Ur3L01HGEDVmroCR6QTi7OLbz0SZ9hQFvHg0KW25YvVIEXoLeiarK
-- All test users are active by default and have departments matching their number

-- ===========================
-- ADMIN USERS (2)
-- ===========================

-- Admin 1
INSERT INTO users (email,name,password,surname,visibility,default_floor_id,default_view_mode_id,department,active)
SELECT 
    'test.admin@mail.de', 
    'Admin', 
    '$2a$10$Ur3L01HGEDVmroCR6QTi7OLbz0SZ9hQFvHg0KW25YvVIEXoLeiarK', 
    'One',
    0x1,
    (SELECT floor_id FROM floors WHERE floors.name='Musteretage 1'),
    (SELECT view_mode_id FROM view_modes WHERE view_modes.view_mode_name='day'),
    'Department 1',
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE users.email = 'test.admin@mail.de'
); 

INSERT INTO user_roles (user_id, role_id) 
SELECT 
    (SELECT id FROM users WHERE users.email = 'test.admin@mail.de'),
    (SELECT id FROM roles WHERE roles.name = 'ROLE_ADMIN')
WHERE NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = (SELECT id FROM users WHERE email = 'test.admin@mail.de')
    AND role_id = (SELECT id FROM roles WHERE name = 'ROLE_ADMIN')
);

-- Admin 2
INSERT INTO users (email,name,password,surname,visibility,default_floor_id,default_view_mode_id,department,active)
SELECT 
    'test.admin2@mail.de', 
    'Admin', 
    '$2a$10$Ur3L01HGEDVmroCR6QTi7OLbz0SZ9hQFvHg0KW25YvVIEXoLeiarK', 
    'Two',
    0x1,
    (SELECT floor_id FROM floors WHERE floors.name='Musteretage 2'),
    (SELECT view_mode_id FROM view_modes WHERE view_modes.view_mode_name='week'),
    'Department 2',
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE users.email = 'test.admin2@mail.de'
); 

INSERT INTO user_roles (user_id, role_id) 
SELECT 
    (SELECT id FROM users WHERE users.email = 'test.admin2@mail.de'),
    (SELECT id FROM roles WHERE roles.name = 'ROLE_ADMIN')
WHERE NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = (SELECT id FROM users WHERE email = 'test.admin2@mail.de')
    AND role_id = (SELECT id FROM roles WHERE name = 'ROLE_ADMIN')
);

-- ===========================
-- EMPLOYEE USERS (8)
-- ===========================

-- Employee 1
INSERT INTO users (email,name,password,surname,visibility,default_floor_id,default_view_mode_id,department,active)
SELECT 
    'test.employee@mail.de', 
    'Employee', 
    '$2a$10$Ur3L01HGEDVmroCR6QTi7OLbz0SZ9hQFvHg0KW25YvVIEXoLeiarK', 
    'One',
    0x1,
    (SELECT floor_id FROM floors WHERE floors.name='Musteretage 1'),
    (SELECT view_mode_id FROM view_modes WHERE view_modes.view_mode_name='day'),
    'Department 1',
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE users.email = 'test.employee@mail.de'
); 

INSERT INTO user_roles (user_id, role_id) 
SELECT 
    (SELECT id FROM users WHERE users.email = 'test.employee@mail.de'),
    (SELECT id FROM roles WHERE roles.name = 'ROLE_EMPLOYEE')
WHERE NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = (SELECT id FROM users WHERE email = 'test.employee@mail.de')
    AND role_id = (SELECT id FROM roles WHERE name = 'ROLE_EMPLOYEE')
);

-- Employee 2
INSERT INTO users (email,name,password,surname,visibility,default_floor_id,default_view_mode_id,department,active)
SELECT 
    'test.employee2@mail.de', 
    'Employee', 
    '$2a$10$Ur3L01HGEDVmroCR6QTi7OLbz0SZ9hQFvHg0KW25YvVIEXoLeiarK', 
    'Two',
    0x1,
    (SELECT floor_id FROM floors WHERE floors.name='Musteretage 1'),
    (SELECT view_mode_id FROM view_modes WHERE view_modes.view_mode_name='day'),
    'Department 2',
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE users.email = 'test.employee2@mail.de'
); 

INSERT INTO user_roles (user_id, role_id) 
SELECT 
    (SELECT id FROM users WHERE users.email = 'test.employee2@mail.de'),
    (SELECT id FROM roles WHERE roles.name = 'ROLE_EMPLOYEE')
WHERE NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = (SELECT id FROM users WHERE email = 'test.employee2@mail.de')
    AND role_id = (SELECT id FROM roles WHERE name = 'ROLE_EMPLOYEE')
);

-- Employee 3
INSERT INTO users (email,name,password,surname,visibility,default_floor_id,default_view_mode_id,department,active)
SELECT 
    'test.employee3@mail.de', 
    'Employee', 
    '$2a$10$Ur3L01HGEDVmroCR6QTi7OLbz0SZ9hQFvHg0KW25YvVIEXoLeiarK', 
    'Three',
    0x1,
    (SELECT floor_id FROM floors WHERE floors.name='Musteretage 1'),
    (SELECT view_mode_id FROM view_modes WHERE view_modes.view_mode_name='day'),
    'Department 3',
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE users.email = 'test.employee3@mail.de'
); 

INSERT INTO user_roles (user_id, role_id) 
SELECT 
    (SELECT id FROM users WHERE users.email = 'test.employee3@mail.de'),
    (SELECT id FROM roles WHERE roles.name = 'ROLE_EMPLOYEE')
WHERE NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = (SELECT id FROM users WHERE email = 'test.employee3@mail.de')
    AND role_id = (SELECT id FROM roles WHERE name = 'ROLE_EMPLOYEE')
);

-- Employee 4
INSERT INTO users (email,name,password,surname,visibility,default_floor_id,default_view_mode_id,department,active)
SELECT 
    'test.employee4@mail.de', 
    'Employee', 
    '$2a$10$Ur3L01HGEDVmroCR6QTi7OLbz0SZ9hQFvHg0KW25YvVIEXoLeiarK', 
    'Four',
    0x1,
    (SELECT floor_id FROM floors WHERE floors.name='Musteretage 2'),
    (SELECT view_mode_id FROM view_modes WHERE view_modes.view_mode_name='week'),
    'Department 4',
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE users.email = 'test.employee4@mail.de'
); 

INSERT INTO user_roles (user_id, role_id) 
SELECT 
    (SELECT id FROM users WHERE users.email = 'test.employee4@mail.de'),
    (SELECT id FROM roles WHERE roles.name = 'ROLE_EMPLOYEE')
WHERE NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = (SELECT id FROM users WHERE email = 'test.employee4@mail.de')
    AND role_id = (SELECT id FROM roles WHERE name = 'ROLE_EMPLOYEE')
);

-- Employee 5
INSERT INTO users (email,name,password,surname,visibility,default_floor_id,default_view_mode_id,department,active)
SELECT 
    'test.employee5@mail.de', 
    'Employee', 
    '$2a$10$Ur3L01HGEDVmroCR6QTi7OLbz0SZ9hQFvHg0KW25YvVIEXoLeiarK', 
    'Five',
    0x1,
    (SELECT floor_id FROM floors WHERE floors.name='Musteretage 2'),
    (SELECT view_mode_id FROM view_modes WHERE view_modes.view_mode_name='week'),
    'Department 5',
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE users.email = 'test.employee5@mail.de'
); 

INSERT INTO user_roles (user_id, role_id) 
SELECT 
    (SELECT id FROM users WHERE users.email = 'test.employee5@mail.de'),
    (SELECT id FROM roles WHERE roles.name = 'ROLE_EMPLOYEE')
WHERE NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = (SELECT id FROM users WHERE email = 'test.employee5@mail.de')
    AND role_id = (SELECT id FROM roles WHERE name = 'ROLE_EMPLOYEE')
);

-- Employee 6
INSERT INTO users (email,name,password,surname,visibility,default_floor_id,default_view_mode_id,department,active)
SELECT 
    'test.employee6@mail.de', 
    'Employee', 
    '$2a$10$Ur3L01HGEDVmroCR6QTi7OLbz0SZ9hQFvHg0KW25YvVIEXoLeiarK', 
    'Six',
    0x1,
    (SELECT floor_id FROM floors WHERE floors.name='Musteretage 1'),
    (SELECT view_mode_id FROM view_modes WHERE view_modes.view_mode_name='month'),
    'Department 6',
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE users.email = 'test.employee6@mail.de'
); 

INSERT INTO user_roles (user_id, role_id) 
SELECT 
    (SELECT id FROM users WHERE users.email = 'test.employee6@mail.de'),
    (SELECT id FROM roles WHERE roles.name = 'ROLE_EMPLOYEE')
WHERE NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = (SELECT id FROM users WHERE email = 'test.employee6@mail.de')
    AND role_id = (SELECT id FROM roles WHERE name = 'ROLE_EMPLOYEE')
);

-- Employee 7
INSERT INTO users (email,name,password,surname,visibility,default_floor_id,default_view_mode_id,department,active)
SELECT 
    'test.employee7@mail.de', 
    'Employee', 
    '$2a$10$Ur3L01HGEDVmroCR6QTi7OLbz0SZ9hQFvHg0KW25YvVIEXoLeiarK', 
    'Seven',
    0x1,
    (SELECT floor_id FROM floors WHERE floors.name='Musteretage 1'),
    (SELECT view_mode_id FROM view_modes WHERE view_modes.view_mode_name='day'),
    'Department 7',
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE users.email = 'test.employee7@mail.de'
); 

INSERT INTO user_roles (user_id, role_id) 
SELECT 
    (SELECT id FROM users WHERE users.email = 'test.employee7@mail.de'),
    (SELECT id FROM roles WHERE roles.name = 'ROLE_EMPLOYEE')
WHERE NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = (SELECT id FROM users WHERE email = 'test.employee7@mail.de')
    AND role_id = (SELECT id FROM roles WHERE name = 'ROLE_EMPLOYEE')
);

-- Employee 8
INSERT INTO users (email,name,password,surname,visibility,default_floor_id,default_view_mode_id,department,active)
SELECT 
    'test.employee8@mail.de', 
    'Employee', 
    '$2a$10$Ur3L01HGEDVmroCR6QTi7OLbz0SZ9hQFvHg0KW25YvVIEXoLeiarK', 
    'Eight',
    0x1,
    (SELECT floor_id FROM floors WHERE floors.name='Musteretage 2'),
    (SELECT view_mode_id FROM view_modes WHERE view_modes.view_mode_name='week'),
    'Department 8',
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE users.email = 'test.employee8@mail.de'
); 

INSERT INTO user_roles (user_id, role_id) 
SELECT 
    (SELECT id FROM users WHERE users.email = 'test.employee8@mail.de'),
    (SELECT id FROM roles WHERE roles.name = 'ROLE_EMPLOYEE')
WHERE NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = (SELECT id FROM users WHERE email = 'test.employee8@mail.de')
    AND role_id = (SELECT id FROM roles WHERE name = 'ROLE_EMPLOYEE')
);

-- ===========================
-- SERVICE PERSONNEL USERS (2)
-- ===========================

-- Service Personnel 1
INSERT INTO users (email,name,password,surname,visibility,default_floor_id,default_view_mode_id,department,active)
SELECT 
    'test.servicepersonnel@mail.de', 
    'Service', 
    '$2a$10$Ur3L01HGEDVmroCR6QTi7OLbz0SZ9hQFvHg0KW25YvVIEXoLeiarK', 
    'One',
    0x1,
    (SELECT floor_id FROM floors WHERE floors.name='Musteretage 1'),
    (SELECT view_mode_id FROM view_modes WHERE view_modes.view_mode_name='day'),
    'Department 1',
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE users.email = 'test.servicepersonnel@mail.de'
); 

INSERT INTO user_roles (user_id, role_id) 
SELECT 
    (SELECT id FROM users WHERE users.email = 'test.servicepersonnel@mail.de'),
    (SELECT id FROM roles WHERE roles.name = 'ROLE_SERVICE_PERSONNEL')
WHERE NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = (SELECT id FROM users WHERE email = 'test.servicepersonnel@mail.de')
    AND role_id = (SELECT id FROM roles WHERE name = 'ROLE_SERVICE_PERSONNEL')
);

-- Service Personnel 2
INSERT INTO users (email,name,password,surname,visibility,default_floor_id,default_view_mode_id,department,active)
SELECT 
    'test.servicepersonnel2@mail.de', 
    'Service', 
    '$2a$10$Ur3L01HGEDVmroCR6QTi7OLbz0SZ9hQFvHg0KW25YvVIEXoLeiarK', 
    'Two',
    0x1,
    (SELECT floor_id FROM floors WHERE floors.name='Musteretage 2'),
    (SELECT view_mode_id FROM view_modes WHERE view_modes.view_mode_name='week'),
    'Department 2',
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE users.email = 'test.servicepersonnel2@mail.de'
); 

INSERT INTO user_roles (user_id, role_id) 
SELECT 
    (SELECT id FROM users WHERE users.email = 'test.servicepersonnel2@mail.de'),
    (SELECT id FROM roles WHERE roles.name = 'ROLE_SERVICE_PERSONNEL')
WHERE NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = (SELECT id FROM users WHERE email = 'test.servicepersonnel2@mail.de')
    AND role_id = (SELECT id FROM roles WHERE name = 'ROLE_SERVICE_PERSONNEL')
);
