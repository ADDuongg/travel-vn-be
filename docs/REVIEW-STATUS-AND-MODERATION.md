# Review: trạng thái, moderation, soft delete

Tài liệu mô tả **workflow 4 trạng thái**, field moderation, soft delete + cron 90 ngày, và hướng dẫn **FE Client** / **FE Admin**. Code backend: [`src/review/`](../src/review/).

---

## Trạng thái (`status`)

| Giá trị | Ý nghĩa |
|---------|---------|
| `PENDING` | Chờ admin duyệt (sau tạo mới hoặc sau khi user sửa lại) |
| `APPROVED` | Đã duyệt, tính vào rating public / hiển thị trong list public |
| `REJECTED` | Admin từ chối; không public; user có thể sửa và gửi lại (về `PENDING`) |
| `HIDDEN` | Đã từng `APPROVED`, admin ẩn; không public; **không cho user chỉnh sửa** |

Chuyển sang `HIDDEN` chỉ hợp lệ khi review hiện tại đang là **`APPROVED`** (backend validate).

---

## Field trên document (schema)

| Field | Khi nào set |
|-------|-------------|
| `approvedAt`, `approvedBy` | `status = APPROVED` |
| `rejectedAt`, `rejectedBy`, `rejectReason` | `status = REJECTED` |
| `hiddenAt`, `hiddenBy`, `hiddenReason` | `status = HIDDEN` |
| `deletedAt` | User soft-delete (chỉ owner); cron xóa cứng sau **90 ngày** |
| `createdAt`, `updatedAt` | Mongoose `timestamps` — mỗi lần cập nhật nội dung, `updatedAt` đổi |

Một user chỉ có **tối đa một** review cho mỗi `(entityType, entityId)` (index unique khi có `userId`).

---

## Rating tổng hợp (tour / room / guide)

Aggregation chỉ gồm review có `status === APPROVED` và `deletedAt` không set (null).

---

## Migration dữ liệu cũ (bắt buộc nếu DB còn `isApproved` boolean)

**Trong repo:** file migrate-mongo [`migrations/20260421120000-review-status-from-isapproved.js`](../migrations/20260421120000-review-status-from-isapproved.js) — chạy:

```bash
yarn db:migrate
```

(Cần `MONGO_URI_LOCAL` và `MONGO_DB_LOCAL` đúng trong `.env`.)

Hoặc chạy thủ công một lần trên MongoDB (điều chỉnh tên DB/collection nếu khác):

```javascript
// Bản ghi cũ có isApproved, chưa có status
db.reviews.updateMany(
  { status: { $exists: false }, isApproved: true },
  { $set: { status: "APPROVED" }, $unset: { isApproved: "" } },
);
db.reviews.updateMany(
  { status: { $exists: false }, isApproved: false },
  { $set: { status: "PENDING" }, $unset: { isApproved: "" } },
);
db.reviews.updateMany(
  { status: { $exists: false }, isApproved: { $exists: false } },
  { $set: { status: "PENDING" } },
);
```

---

## API (tóm tắt)

Base: `/api/v1/reviews`

| Method | Path | Auth | Ghi chú |
|--------|------|------|---------|
| GET | `/` | Public | List theo entity — chỉ `APPROVED`, `deletedAt` null |
| GET | `/me` | JWT | Review của user cho một entity (không soft-deleted) |
| GET | `/me/list` | JWT | Danh sách của user; `?status=PENDING,APPROVED` (CSV); không filter = **tất cả** trạng thái (trừ đã xóa mềm) |
| POST | `/` | JWT | Upsert; sau lưu → `PENDING` (reset field moderation); **HIDDEN** → 403 |
| DELETE | `/:id` | JWT | Soft delete (owner) |
| GET | `/admin` | JWT + **admin** | `?status=`, `?includeDeleted=true` |
| PATCH | `/:id/approve` | JWT + **admin** | Set `APPROVED` + `approvedAt` / `approvedBy` |
| PATCH | `/:id/status` | JWT + **admin** | Body: `{ status, rejectReason?, hiddenReason? }` — **dropdown đổi trạng thái** |

Cron: [`ReviewSoftDeleteCleanupService`](../src/review/review-soft-delete-cleanup.service.ts) — mỗi ngày xóa cứng document có `deletedAt` cũ hơn 90 ngày.

---

## FE Client

- **Trang entity (tour, room, …)**  
  - Public list: chỉ review `APPROVED`.  
  - `GET /me` để biết review của user: theo `status` hiển thị banner / form:  
    - `PENDING`: “đang chờ duyệt”; không hiện comment public; không tạo review thứ hai (một document / entity).  
    - `APPROVED`: hiện public; cho **sửa** (POST upsert → lại `PENDING`).  
    - `REJECTED`: không public; cho **sửa** và gửi lại.  
    - `HIDDEN`: owner thấy trạng thái; **không** cho sửa.

- **Dashboard “My Reviews”**  
  - `GET /me/list` + `entitySummary`; hiển thị `status`, `updatedAt`; lọc `?status=PENDING` hoặc CSV.

---

## FE Admin

- Bảng moderation: `GET /admin` với filter `status`, `entityType`, `includeDeleted`.  
- **Dropdown** (hoặc select) đổi trạng thái → `PATCH /reviews/:id/status` với body `{ status, rejectReason?, hiddenReason? }`.  
- Nút “Duyệt nhanh” có thể gọi `PATCH /reviews/:id/approve` (tương đương `APPROVED`).

---

## File liên quan

- [`src/review/schema/ewview.schema.ts`](../src/review/schema/ewview.schema.ts)  
- [`src/review/review.service.ts`](../src/review/review.service.ts)  
- [`src/review/review.controller.ts`](../src/review/review.controller.ts)  
- [`src/review/dto/admin-review-status.dto.ts`](../src/review/dto/admin-review-status.dto.ts)  
- [`src/review/review-soft-delete-cleanup.service.ts`](../src/review/review-soft-delete-cleanup.service.ts)  
