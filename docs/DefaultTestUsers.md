# Default Test Users

This document lists all default test accounts created during database initialization. All accounts use the password: **`test`**

## Admin Accounts (2)

Admins have full access to all features including the admin panel, and inherit both employee and service personnel privileges via role hierarchy.

| Email | Name | Password | Department | Roles |
|-------|------|----------|------------|-------|
| test.admin@mail.de | Admin One | test | Department 1 | ROLE_ADMIN |
| test.admin2@mail.de | Admin Two | test | Department 2 | ROLE_ADMIN |

## Employee Accounts (8)

Employees can book desks, manage their bookings, and view colleagues.

| Email | Name | Password | Department | Roles |
|-------|------|----------|------------|-------|
| test.employee@mail.de | Employee One | test | Department 1 | ROLE_EMPLOYEE |
| test.employee2@mail.de | Employee Two | test | Department 2 | ROLE_EMPLOYEE |
| test.employee3@mail.de | Employee Three | test | Department 3 | ROLE_EMPLOYEE |
| test.employee4@mail.de | Employee Four | test | Department 4 | ROLE_EMPLOYEE |
| test.employee5@mail.de | Employee Five | test | Department 5 | ROLE_EMPLOYEE |
| test.employee6@mail.de | Employee Six | test | Department 6 | ROLE_EMPLOYEE |
| test.employee7@mail.de | Employee Seven | test | Department 7 | ROLE_EMPLOYEE |
| test.employee8@mail.de | Employee Eight | test | Department 8 | ROLE_EMPLOYEE |

## Service Personnel Accounts (2)

Service personnel accounts for future service-related features.

| Email | Name | Password | Department | Roles |
|-------|------|----------|------------|-------|
| test.servicepersonnel@mail.de | Service One | test | Department 1 | ROLE_SERVICE_PERSONNEL |
| test.servicepersonnel2@mail.de | Service Two | test | Department 2 | ROLE_SERVICE_PERSONNEL |

## Notes

- **Security Warning**: These test accounts use a well-known password (`test`) and should **NEVER** be used in production environments.
- After setting up your real users, delete all test accounts to maintain security.
- Users can have multiple roles (e.g., both Employee and Service Personnel).
- Admins automatically inherit permissions from Employee and Service Personnel roles via role hierarchy.
- All test users are **active** by default. Admins can deactivate/reactivate users via the admin panel.
- The password hash used in the database: `$2a$10$Ur3L01HGEDVmroCR6QTi7OLbz0SZ9hQFvHg0KW25YvVIEXoLeiarK`
