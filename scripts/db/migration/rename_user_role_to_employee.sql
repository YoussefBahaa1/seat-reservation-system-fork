-- Migrate ROLE_USER to ROLE_EMPLOYEE and add ROLE_SERVICE_PERSONNEL
-- Run this migration on existing databases to update role names

-- Rename ROLE_USER to ROLE_EMPLOYEE
UPDATE roles SET name = 'ROLE_EMPLOYEE' WHERE name = 'ROLE_USER';

-- Add ROLE_SERVICE_PERSONNEL if it doesn't exist
INSERT INTO roles (name)
SELECT 'ROLE_SERVICE_PERSONNEL'
WHERE NOT EXISTS (
    SELECT 1 FROM roles WHERE name = 'ROLE_SERVICE_PERSONNEL'
);
