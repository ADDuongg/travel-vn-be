# Review & rating (Tour, Room, Hotel, Guide)

Tài liệu API và mô hình. **Luồng moderation (PENDING / APPROVED / REJECTED / HIDDEN), soft delete, cron 90 ngày, FE Client & Admin** được mô tả đầy đủ trong **[REVIEW-STATUS-AND-MODERATION.md](./REVIEW-STATUS-AND-MODERATION.md)**.

---

## Data model

Schema: [`src/review/schema/ewview.schema.ts`](../src/review/schema/ewview.schema.ts), collection `reviews`.

Các field chính: `entityType`, `entityId`, `rating`, `comment`, `userId`, `isAnonymous`, **`status`** (`PENDING` | `APPROVED` | `REJECTED` | `HIDDEN`), các field moderation (`approvedAt` / `approvedBy`, `rejectedAt` / `rejectedBy` / `rejectReason`, `hiddenAt` / `hiddenBy` / `hiddenReason`), **`deletedAt`** (soft delete).

`createdAt` / `updatedAt`: Mongoose timestamps — **mỗi lần chỉnh sửa** review, `updatedAt` cập nhật.

---

## Entity summary

Endpoint `GET /api/v1/reviews/me/list` trả thêm:

```ts
entitySummary: { name: string; thumbnailUrl: string }
```

Chi tiết resolve theo `entityType` và `lang` xem [REVIEW-STATUS-AND-MODERATION.md](./REVIEW-STATUS-AND-MODERATION.md).

---

## API (tóm tắt)

Base: **`/api/v1/reviews`**

| Method | Path | Auth |
|--------|------|------|
| GET | `/` | Public — list `APPROVED` theo entity |
| GET | `/me` | JWT |
| GET | `/me/list` | JWT — `?status=` CSV (optional; không gửi = mọi trạng thái) |
| POST | `/` | JWT — upsert → `PENDING` (trừ `HIDDEN`) |
| DELETE | `/:id` | JWT — soft delete (owner) |
| GET | `/admin` | JWT + **admin** |
| PATCH | `/:id/approve` | JWT + **admin** |
| PATCH | `/:id/status` | JWT + **admin** — body `{ status, rejectReason?, hiddenReason? }` |

---

## FE Client & FE Admin

Xem **[REVIEW-STATUS-AND-MODERATION.md](./REVIEW-STATUS-AND-MODERATION.md)** (dashboard, entity page, dropdown admin).

---

## Migration

Nếu database còn field **`isApproved`** cũ, chạy script trong [REVIEW-STATUS-AND-MODERATION.md](./REVIEW-STATUS-AND-MODERATION.md) trước khi deploy schema mới.
