# RBAC Implementation Plan

## Project

Travel / Hotel Platform
Tech Stack: NestJS + TypeScript + MongoDB + React Admin

---

## 1. Tổng quan

RBAC chỉ áp dụng cho `/api/v1/admin/*`.

| Route prefix       | Auth             | RBAC |
| ------------------ | ---------------- | ---- |
| `/api/v1/public/*` | Không bắt buộc   | ❌   |
| `/api/v1/client/*` | JWT + ownership  | ❌   |
| `/api/v1/admin/*`  | JWT + Permission | ✅   |

---

## 2. Database Schema

### Collection: `admins`

```ts
{
  _id: ObjectId,
  email: string,
  password: string,           // bcrypt
  isSuperAdmin: boolean,      // bypass tất cả permission checks
  roleIds: ObjectId[],
  isActive: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Collection: `roles`

```ts
{
  _id: ObjectId,
  name: string,               // 'super_admin' | 'admin' | 'editor' | 'guide' | 'viewer'
  description: string,
  isDefault: boolean,
  createdAt: Date
}
```

### Collection: `permissions`

```ts
{
  _id: ObjectId,
  resource: string,           // 'hotel' | 'booking' | 'blog' | ...
  action: string,             // 'view' | 'create' | 'update' | 'delete' | ...
  description: string
}
// key = `${resource}.${action}` — ví dụ: 'hotel.create'
```

### Collection: `role_permissions`

```ts
{
  _id: ObjectId,
  roleId: ObjectId,
  permissionId: ObjectId
}
```

---

## 3. Permission List

Convention: `resource.action`

| Resource    | Actions                               |
| ----------- | ------------------------------------- |
| `hotel`     | view, create, update, delete          |
| `room`      | view, create, update, delete          |
| `tour`      | view, create, update, delete          |
| `booking`   | view, update, cancel, refund          |
| `payment`   | view, refund                          |
| `blog`      | view, create, update, publish, delete |
| `user`      | view, create, update, delete          |
| `inventory` | view, manage                          |
| `media`     | upload, delete                        |
| `dashboard` | view                                  |
| `settings`  | manage                                |
| `audit_log` | view                                  |

---

## 4. Default Roles & Permission Mapping

| Permission       | super_admin | admin | editor | guide | viewer |
| ---------------- | :---------: | :---: | :----: | :---: | :----: |
| dashboard.view   |     ✅      |  ✅   |   ✅   |  ✅   |   ✅   |
| user.view        |     ✅      |  ✅   |   ❌   |  ❌   |   ✅   |
| user.create      |     ✅      |  ✅   |   ❌   |  ❌   |   ❌   |
| user.update      |     ✅      |  ✅   |   ❌   |  ❌   |   ❌   |
| user.delete      |     ✅      |  ✅   |   ❌   |  ❌   |   ❌   |
| hotel.view       |     ✅      |  ✅   |   ✅   |  ✅   |   ✅   |
| hotel.create     |     ✅      |  ✅   |   ❌   |  ❌   |   ❌   |
| hotel.update     |     ✅      |  ✅   |   ✅   |  ❌   |   ❌   |
| hotel.delete     |     ✅      |  ✅   |   ❌   |  ❌   |   ❌   |
| room.view        |     ✅      |  ✅   |   ✅   |  ✅   |   ✅   |
| room.create      |     ✅      |  ✅   |   ❌   |  ❌   |   ❌   |
| room.update      |     ✅      |  ✅   |   ✅   |  ❌   |   ❌   |
| room.delete      |     ✅      |  ✅   |   ❌   |  ❌   |   ❌   |
| tour.view        |     ✅      |  ✅   |   ✅   |  ✅   |   ✅   |
| tour.create      |     ✅      |  ✅   |   ❌   |  ❌   |   ❌   |
| tour.update      |     ✅      |  ✅   |   ✅   |  ✅   |   ❌   |
| tour.delete      |     ✅      |  ✅   |   ❌   |  ❌   |   ❌   |
| blog.view        |     ✅      |  ✅   |   ✅   |  ❌   |   ✅   |
| blog.create      |     ✅      |  ✅   |   ✅   |  ❌   |   ❌   |
| blog.update      |     ✅      |  ✅   |   ✅   |  ❌   |   ❌   |
| blog.publish     |     ✅      |  ✅   |   ✅   |  ❌   |   ❌   |
| blog.delete      |     ✅      |  ✅   |   ❌   |  ❌   |   ❌   |
| booking.view     |     ✅      |  ✅   |   ❌   |  ✅   |   ✅   |
| booking.update   |     ✅      |  ✅   |   ❌   |  ✅   |   ❌   |
| booking.cancel   |     ✅      |  ✅   |   ❌   |  ❌   |   ❌   |
| booking.refund   |     ✅      |  ✅   |   ❌   |  ❌   |   ❌   |
| payment.view     |     ✅      |  ✅   |   ❌   |  ❌   |   ❌   |
| payment.refund   |     ✅      |  ✅   |   ❌   |  ❌   |   ❌   |
| inventory.view   |     ✅      |  ✅   |   ❌   |  ✅   |   ✅   |
| inventory.manage |     ✅      |  ✅   |   ❌   |  ✅   |   ❌   |
| media.upload     |     ✅      |  ✅   |   ✅   |  ❌   |   ❌   |
| media.delete     |     ✅      |  ✅   |   ❌   |  ❌   |   ❌   |
| settings.manage  |     ✅      |  ❌   |   ❌   |  ❌   |   ❌   |
| audit_log.view   |     ✅      |  ✅   |   ❌   |  ❌   |   ❌   |

> **super_admin** dùng flag `isSuperAdmin: true` — bypass toàn bộ guard, không cần seed permission.

---

## 5. JWT Payload

Sau khi login, trả về JWT có payload:

```ts
{
  sub: string,           // adminId
  email: string,
  isSuperAdmin: boolean,
  roles: string[],       // ['admin', 'editor']
  permissions: string[], // ['hotel.view', 'hotel.create', 'blog.view', ...]
  iat: number,
  exp: number
}
```

Response body login:

```json
{
  "accessToken": "...",
  "user": {
    "id": "...",
    "email": "...",
    "roles": ["admin"]
  },
  "permissions": ["hotel.view", "hotel.create", "blog.view"]
}
```

---

## 6. Guards & Decorators

### Decorator: `@RequirePermissions`

```ts
// require-permissions.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
```

### Guard: `JwtAuthGuard`

- Verify JWT token
- Gắn `request.user` từ payload

### Guard: `AdminGuard`

```ts
// Chỉ cho phép nếu admin đang active
// Check: admin tồn tại trong DB và isActive === true
```

### Guard: `PermissionGuard`

```ts
// permission.guard.ts — logic chính

canActivate(context) {
  const required = reflector.get(PERMISSIONS_KEY, handler);
  if (!required || required.length === 0) return false; // default deny

  const { user } = request;

  if (user.isSuperAdmin) return true; // bypass

  return required.every(p => user.permissions.includes(p));
}
```

> **Default Deny**: route admin nào không có `@RequirePermissions` sẽ bị từ chối.

### Áp dụng global cho admin module

```ts
// admin.module.ts
providers: [
  { provide: APP_GUARD, useClass: JwtAuthGuard },
  { provide: APP_GUARD, useClass: AdminGuard },
  { provide: APP_GUARD, useClass: PermissionGuard },
];
```

### Ví dụ sử dụng trên controller

```ts
@Get()
@RequirePermissions('hotel.view')
findAll() {}

@Post()
@RequirePermissions('hotel.create')
create() {}

@Patch(':id')
@RequirePermissions('hotel.update')
update() {}

@Delete(':id')
@RequirePermissions('hotel.delete')
remove() {}

@Post(':id/refund')
@RequirePermissions('payment.refund')
refund() {}
```

---

## 7. Seed Data

### Seed permissions

```ts
// seed tất cả permissions từ danh sách ở mục 3
// format: { resource, action, description }
// ví dụ: { resource: 'hotel', action: 'create', description: 'Tạo khách sạn mới' }
```

### Seed roles

```ts
['super_admin', 'admin', 'editor', 'guide', 'viewer'];
```

### Seed role_permissions

```ts
// Map theo bảng ở mục 4
// super_admin không cần seed — dùng isSuperAdmin flag
```

---

## 8. Frontend — React Admin

### Permission helper

```ts
// utils/permission.ts
const permissions: string[] = getFromLocalStorage('permissions'); // load sau login

export const canAccess = (permission: string): boolean =>
  permissions.includes(permission);
```

### Sidebar — ẩn menu

```tsx
{
  canAccess('hotel.view') && <MenuItemHotels />;
}
{
  canAccess('user.view') && <MenuItemUsers />;
}
{
  canAccess('booking.view') && <MenuItemBookings />;
}
```

### Buttons — ẩn / disable

```tsx
{
  canAccess('hotel.create') && <CreateButton />;
}
{
  canAccess('hotel.update') && <EditButton />;
}
{
  canAccess('hotel.delete') && <DeleteButton />;
}
{
  canAccess('booking.refund') && <RefundButton />;
}
{
  canAccess('blog.publish') && <PublishButton />;
}
```

### Route guard

```tsx
// ProtectedRoute.tsx
if (!canAccess(requiredPermission)) {
  return <Navigate to="/403" />;
}
```

---

## 9. Implementation Phases

### Phase 1 — Foundation (Week 1, đầu)

- [ ] Tạo collections: `roles`, `permissions`, `role_permissions`
- [ ] Cập nhật schema `admins` (thêm `roleIds`, `isSuperAdmin`)
- [ ] Viết seed script
- [ ] Tạo decorator `@RequirePermissions`
- [ ] Viết 3 guards: `JwtAuthGuard`, `AdminGuard`, `PermissionGuard`
- [ ] Cập nhật login response trả về `permissions[]`

### Phase 2 — Sensitive Modules (Week 1, cuối)

Áp dụng guard cho:

- [ ] `/admin/users`
- [ ] `/admin/settings`
- [ ] `/admin/audit-logs`
- [ ] `/admin/dashboard`

### Phase 3 — Content Modules (Week 2)

Áp dụng guard cho:

- [ ] `/admin/hotels`
- [ ] `/admin/rooms`
- [ ] `/admin/tours`
- [ ] `/admin/blogs`
- [ ] `/admin/media`
- [ ] `/admin/provinces`, `/admin/amenities`, `/admin/languages`

### Phase 4 — Operations (Week 3)

Áp dụng guard cho:

- [ ] `/admin/bookings`
- [ ] `/admin/tour-bookings`
- [ ] `/admin/payments`
- [ ] `/admin/room-inventories`
- [ ] `/admin/tour-inventory`

---

## 10. Audit Log

Track các action nhạy cảm:

| Action          | Ghi log |
| --------------- | ------- |
| user.delete     | ✅      |
| booking.cancel  | ✅      |
| booking.refund  | ✅      |
| payment.refund  | ✅      |
| settings.manage | ✅      |
| role thay đổi   | ✅      |

---

## 11. Testing Checklist

- [ ] Không có token → 401
- [ ] Token không hợp lệ / hết hạn → 401
- [ ] Token hợp lệ nhưng không có permission → 403
- [ ] Token hợp lệ, có đúng permission → 200
- [ ] Role có nhưng role đó không được gán permission → 403
- [ ] `isSuperAdmin: true` → bypass tất cả → 200
- [ ] Route không có `@RequirePermissions` → 403 (default deny)
- [ ] Frontend: menu bị ẩn đúng theo permission
- [ ] Frontend: button bị ẩn đúng theo permission

---

## 12. Nguyên tắc cốt lõi

> **Role = nhóm permissions. Permission = quyền thực sự.**
>
> Không hardcode check role trong business logic.
> Chỉ check permission trên route.
> Default deny — không có metadata thì từ chối.
> Super admin dùng flag, không dùng wildcard permission.
