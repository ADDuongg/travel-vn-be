Act as a senior backend architect.

I need you to design and implement a SIMPLE, CLEAN, SCALABLE RBAC system for my project (travel / hotel admin system).

Tech stack:

- NestJS
- TypeScript
- MongoDB (Mongoose) // if project uses Prisma, adapt accordingly
- Admin dashboard frontend (React)

Goal:
I only need BASIC RBAC now.
Do NOT overengineer.
No ABAC for now.

=====================================
ROLES
=====================================

Create these roles:

1. super_admin

- full access to everything

2. admin

- manage most business modules

3. editor

- content management only

4. guide

- limited operational access

5. viewer

- read only

=====================================
PERMISSIONS FORMAT
=====================================

Use permission naming convention:

resource.action

Examples:

hotel.view
hotel.create
hotel.update
hotel.delete

room.view
room.create
room.update
room.delete

booking.view
booking.update
booking.cancel

blog.view
blog.create
blog.update
blog.publish
blog.delete

province.view
province.update

tour.view
tour.create
tour.update
tour.delete

user.view
user.create
user.update
user.delete

settings.manage

dashboard.view

audit_log.view

=====================================
EXPECTED OUTPUT
=====================================

Please generate a production-ready RBAC architecture including:

1. Database Models / Schemas

Need collections/tables:

roles
permissions
role_permissions
users (with role reference OR multiple roles if better)

Use clean schema design.

2. Seed Data

Create initial seed for:

- all permissions
- all default roles
- map permissions to roles

3. Permission Mapping Example

super_admin -> _
admin -> hotel._, room._, booking._, blog._, dashboard.view
editor -> blog._, hotel.view, booking.view
guide -> booking.view, booking.update, hotel.view, room.view
viewer -> \*.view only

(Use explicit permissions if wildcard is not recommended.)

4. NestJS Backend Implementation

Generate:

- decorators:
  @RequirePermissions(...)

- guards:
  JwtAuthGuard
  PermissionGuard

- usage examples:

@Get()
@RequirePermissions('hotel.view')

@Post()
@RequirePermissions('hotel.create')

5. Auth Flow

When login:
Return user info + roles + permissions.

6. Frontend Usage (React)

Provide examples:

- hide sidebar menu if no permission
- disable button if no permission
- route guard by permission

Example:

CanAccess('hotel.create')

7. Best Practices

Need advice for:

- cache permissions in JWT or Redis
- avoid querying permissions every request
- easy future upgrade to ABAC later
- audit logs for denied actions

=====================================
IMPORTANT RULES
=====================================

- Keep system simple
- Clean naming
- Scalable later
- Maintainable for solo developer
- Avoid unnecessary complexity
- Follow senior engineering standards

=====================================
FINAL REQUEST
=====================================

Generate full folder structure + code examples + recommended implementation order step by step.
