# RBAC backend — Tài liệu triển khai (NestJS)

Tài liệu mô tả hệ thống phân quyền **RBAC** đã tích hợp trong repo này: quy ước `resource.action`, guards, JWT, MongoDB và seed. Tham chiếu thêm [plans/RBAC_PLANS.md](../plans/RBAC_PLANS.md) và hướng dẫn FE: [FE-RBAC-ADMIN.md](./FE-RBAC-ADMIN.md).

---

## 1. Phạm vi

| Prefix API | RBAC |
|------------|------|
| `/api/v1/public/*` | Không |
| `/api/v1/client/*` | Không (JWT + ownership theo từng route) |
| `/api/v1/admin/*` | Có — `JwtAuthGuard` → `AdminGuard` → `PermissionGuard` + `@RequirePermissions` |

**Nguyên tắc:** không hardcode check role trong business logic; kiểm tra **permission** trên route. **Default deny:** route admin mà handler **không** có `@RequirePermissions(...)` → **403** (thiếu metadata).

**Super admin:** trường `User.isSuperAdmin === true` → bypass `PermissionGuard` (không cần seed permission đầy đủ cho role `super_admin` trong DB).

---

## 2. Mô hình dữ liệu (MongoDB)

### Collection `user` (Mongoose `User`)

- `roles: string[]` — mã role khớp `Role.code` (vd. `admin`, `editor`, `viewer`).
- `isSuperAdmin: boolean` — bypass RBAC trên API (mặc định `false`).

Schema: [`src/user/schema/user.schema.ts`](../src/user/schema/user.schema.ts).

### Collection `roles` (schema hiện có)

- `code` (unique), `name`, `description`, `isActive`.
- Các role chuẩn seed: `super_admin`, `admin`, `editor`, `guide`, `viewer`.

Schema: [`src/roles/schemas/role.schema.ts`](../src/roles/schemas/role.schema.ts).

### Collection `permissions`

- `resource`, `action`, `key` (duy nhất, dạng `resource.action`), `description`.
- Đăng ký Mongoose: [`src/rbac/schemas/rbac-permission.schema.ts`](../src/rbac/schemas/rbac-permission.schema.ts) (collection name: `permissions`).

### Collection `role_permissions`

- `roleId` → ref `Role`, `permissionId` → ref `RbacPermission`.
- Unique `(roleId, permissionId)`.

Schema: [`src/rbac/schemas/rbac-role-permission.schema.ts`](../src/rbac/schemas/rbac-role-permission.schema.ts).

### Legacy (giữ nguyên)

- `api_role` / `router_role` + Redis — [`PermissionService`](../src/permission/permission.service.ts) vẫn trả `account.permissions: { routers, apis }` cho FE cũ; RBAC mới **bổ sung** `rbacPermissions`, không thay thế object cũ.

---

## 3. Luồng permission

1. **Đăng nhập / refresh / `me`:** [`AuthService`](../src/auth/auth.service.ts) gọi `RbacService.resolveFlatPermissions(roles, isSuperAdmin)` → mảng string `resource.action`.
2. **JWT access:** payload có `rbacPermissions`, `isSuperAdmin` (interface [`AccessTokenPayload`](../src/auth/interfaces/jwt-payload.interface.ts)).
3. **Request:** [`JwtStrategy`](../src/jwt/jwt.strategy.ts) gắn `req.user` gồm `userId`, `roles`, `rbacPermissions`, `isSuperAdmin`.
4. **Admin route:** `AdminGuard` kiểm tra user còn active, thuộc portal staff (`hasPortalStaffRole`) hoặc `isSuperAdmin` — [`UserService.assertAdminPortalAccess`](../src/user/user.service.ts), [`staff-role.util.ts`](../src/rbac/staff-role.util.ts).
5. **`PermissionGuard`:** nếu path chứa `/admin`, bắt buộc có `@RequirePermissions(...)` và user phải có **đủ** từng key (logic `every`); super admin bypass.

Cache Redis TTL ~300s trong [`RbacService`](../src/rbac/rbac.service.ts) (tương tự legacy permission resolver).

---

## 4. API code — file chính

| Thành phần | File |
|------------|------|
| Hằng & metadata key | [`src/rbac/constants.ts`](../src/rbac/constants.ts) (`RBAC_PERMISSIONS_METADATA_KEY`) |
| Seed data & ma trận role → key | [`src/rbac/rbac-seed.data.ts`](../src/rbac/rbac-seed.data.ts) |
| Resolver + cache | [`src/rbac/rbac.service.ts`](../src/rbac/rbac.service.ts) |
| Admin RBAC matrix | [`src/rbac/rbac.admin.controller.ts`](../src/rbac/rbac.admin.controller.ts) |
| Admin Roles CRUD | [`src/roles/roles.admin.controller.ts`](../src/roles/roles.admin.controller.ts) |
| Module global (`exports` kèm `UserModule`) | [`src/rbac/rbac.module.ts`](../src/rbac/rbac.module.ts) |
| Decorator | [`src/common/decorators/require-permissions.decorator.ts`](../src/common/decorators/require-permissions.decorator.ts) |
| `PermissionGuard` | [`src/guards/permission.guard.ts`](../src/guards/permission.guard.ts) |
| `AdminGuard` | [`src/guards/admin.guard.ts`](../src/guards/admin.guard.ts) |

Đăng ký app: import [`RbacModule`](../src/rbac/rbac.module.ts) trong [`AppModule`](../src/app.module.ts); `AuthModule` cũng import `RbacModule` để inject `RbacService`.

---

## 5. Sử dụng trên controller

```typescript
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AdminGuard } from 'src/guards/admin.guard';
import { PermissionGuard } from 'src/guards/permission.guard';
import { RequirePermissions } from 'src/common/decorators/require-permissions.decorator';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard, PermissionGuard)
@Controller('admin/example')
export class ExampleAdminController {
  @Get()
  @RequirePermissions('example.view')
  list() { /* ... */ }
}
```

Các endpoint cần **nhiều** permission phải thỏa **tất cả** (toán tử `every`). Ví dụ `@RequirePermissions('a', 'b')` → user cần có cả `a` và `b`.

---

## 6. Admin API — Role documents (catalog Mongo `roles`)

CRUD REST nằm dưới **`/api/v1/admin/roles`**, không còn endpoint public `/api/v1/roles`.

| Method | Path | RBAC permission |
|--------|------|------------------|
| `GET` | `/api/v1/admin/roles` | `role.view` |
| `GET` | `/api/v1/admin/roles/:id` | `role.view` |
| `POST` | `/api/v1/admin/roles` | `rbac.manage` |
| `PATCH` | `/api/v1/admin/roles/:id` | `rbac.manage` |
| `DELETE` | `/api/v1/admin/roles/:id` | `rbac.manage` |

Controller: [`src/roles/roles.admin.controller.ts`](../src/roles/roles.admin.controller.ts). Sau `DELETE`: xóa junction `role_permissions` cho `_id` đó; **409** nếu user nào còn có `roles` chứa `role.code`. Chi tiết FE: [`FE-ROLES-ADMIN.md`](./FE-ROLES-ADMIN.md).

---

## 7. Gán quyền theo role (runtime)

- **Catalog** permission (danh sách key hợp lệ) vẫn được duy trì bằng seed / deploy (xem mục 8); route admin chỉ chấp nhận key đã tồn tại trong collection `permissions`.
- **Mapping role → permission** lưu ở MongoDB (`role_permissions`). Có thể chỉnh qua **Admin API** (không cần sửa code); user cần permission `rbac.manage` (hoặc `isSuperAdmin`).

| Method | Path | Mô tả |
|--------|------|--------|
| `GET` | `/api/v1/admin/rbac/permissions` | Danh sách catalog `permissions` (key, resource, action, description). |
| `GET` | `/api/v1/admin/rbac/roles/:roleId/permissions` | Mảng key đang gán cho role (`roleId` = `_id` document trong collection `roles`). Role `super_admin` không dùng junction → trả `[]`. |
| `PUT` | `/api/v1/admin/rbac/roles/:roleId/permissions` | Body `{ "permissionKeys": string[] }` — **thay thế toàn bộ** (mảng rỗng = thu hết quyền). Phản hồi gồm `roleId`, `roleCode`, `previousKeys`, `newKeys`. Không cho sửa junction của role `super_admin` (403). |

Sau `PUT`, server gọi `invalidateAllFlatPermissionCaches()` (xóa mọi key Redis `rbac:flat:*`). User đang dùng JWT cũ vẫn giữ `rbacPermissions` cho đến khi refresh token / đăng nhập lại.

---

## 8. Seed

- Script: [`scripts/database/seed-rbac.ts`](../scripts/database/seed-rbac.ts).
- Lệnh: `yarn db:seed:rbac` (biến môi trường `DB_URI` hoặc `MONGO_URI_LOCAL` trong `.env`).
- **Mặc định (idempotent):** upsert toàn bộ documents trong `permissions`, upsert `roles` — **không** đụng `role_permissions` (giữ cấu hình custom trên môi trường).
- **Rebuild ma trận mặc định** từ [`rbac-seed.data.ts`](../src/rbac/rbac-seed.data.ts) (xóa và ghi lại `role_permissions` theo ma trận; super_admin vẫn không gán junction): chạy `yarn db:seed:rbac -- --sync-default-matrix` hoặc đặt `RBAC_SEED_SYNC_MATRIX=true`.

---

## 9. Lỗi HTTP thường gặp

| HTTP | Nguyên nhân |
|------|-------------|
| 401 | Không có / sai JWT (`JwtAuthGuard`) |
| 403 | `AdminGuard`: tài khoản không phải staff portal hoặc inactive / đã soft-delete |
| 403 `Missing required permissions metadata` | Admin route không gắn `@RequirePermissions` |
| 403 `Insufficient permissions` | Thiếu quyền so với key yêu cầu |
| 400 (body) | `PUT` RBAC: có key trong `permissionKeys` không tồn tại trong catalog `permissions` |
| 403 | Cập nhật junction cho role `super_admin` (không hỗ trợ) |
| 409 | `DELETE /admin/roles/:id`: còn user với `roles` chứa `code` của role đó |

---

## 10. Ghi chú vận hành

- Sau khi đổi mapping (API hoặc tay): API admin đã xóa prefix Redis `rbac:flat:*`; nếu chỉnh trực tiếp DB, có thể xóa prefix đó hoặc đợi TTL ~300s. Có thêm `invalidateCachesForRoles` / `invalidateAllFlatPermissionCaches` trên `RbacService` khi cần gọi chủ động.
- Thay đổi RBAC qua API được ghi **audit log** (`category: CRUD`, `resourceType: ROLE`, `action: RESOURCE_UPDATED`).
- Người dùng đã đăng nhập trước khi bật RBAC cần **đăng nhập lại** để JWT có `rbacPermissions` đầy đủ.

---

## 11. Tài liệu liên quan

- [FE-RBAC-ADMIN.md](./FE-RBAC-ADMIN.md) — contract RBAC matrix & JWT.
- [FE-ROLES-ADMIN.md](./FE-ROLES-ADMIN.md) — `/api/v1/admin/roles` và breaking change.
- [plans/RBAC_PLANS.md](../plans/RBAC_PLANS.md) — bản kế hoạch & ma trận role gốc.
