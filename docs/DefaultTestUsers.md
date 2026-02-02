# Default Test Users

This document lists all default test accounts created during database initialization. All accounts use the password: **`test`**

## Admin Accounts (2)

Admins have full access to all features including the admin panel, and inherit both employee and service personnel privileges via role hierarchy.

| Email | Name | Password | Roles |
|-------|------|----------|-------|
| test.admin@mail.de | Admin One | test | ROLE_ADMIN |
| test.admin2@mail.de | Admin Two | test | ROLE_ADMIN |

## Employee Accounts (8)

Employees can book desks, manage their bookings, and view colleagues.

| Email | Name | Password | Roles |
|-------|------|----------|-------|
| test.employee@mail.de | Employee One | test | ROLE_EMPLOYEE |
| test.employee2@mail.de | Employee Two | test | ROLE_EMPLOYEE |
| test.employee3@mail.de | Employee Three | test | ROLE_EMPLOYEE |
| test.employee4@mail.de | Employee Four | test | ROLE_EMPLOYEE |
| test.employee5@mail.de | Employee Five | test | ROLE_EMPLOYEE |
| test.employee6@mail.de | Employee Six | test | ROLE_EMPLOYEE |
| test.employee7@mail.de | Employee Seven | test | ROLE_EMPLOYEE |
| test.employee8@mail.de | Employee Eight | test | ROLE_EMPLOYEE |

## Service Personnel Accounts (2)

Service personnel accounts for future service-related features.

| Email | Name | Password | Roles |
|-------|------|----------|-------|
| test.servicepersonnel@mail.de | Service One | test | ROLE_SERVICE_PERSONNEL |
| test.servicepersonnel2@mail.de | Service Two | test | ROLE_SERVICE_PERSONNEL |

## Notes

- **Security Warning**: These test accounts use a well-known password (`test`) and should **NEVER** be used in production environments.
- After setting up your real users, delete all test accounts to maintain security.
- A user can have both Employee and Service Personnel roles.
- An admin can only have Admin role.
- Admins automatically inherit permissions from Employee and Service Personnel roles via role hierarchy.
- The password hash used in the database: `$2a$10$Ur3L01HGEDVmroCR6QTi7OLbz0SZ9hQFvHg0KW25YvVIEXoLeiarK`
