# Notification API — FE Admin & FE Client

Tài liệu API thông báo (in-app) cho cả **FE Admin** và **FE Client**. Cả hai đều dùng chung các endpoint dưới đây; sự khác biệt nằm ở **loại thông báo** mà mỗi role nhận được.

---

## Tổng quan

- **Cơ chế**: Polling API (không dùng WebSocket)
- **Auth**: Tất cả endpoint yêu cầu JWT (header `Authorization: Bearer <token>`)
- **Base path**: `/api/v1/notifications`

---

## Endpoints

### 1. Lấy danh sách thông báo (có phân trang)

```
GET /api/v1/notifications
```

**Query params:**

| Param   | Type    | Default | Mô tả                                      |
| ------- | ------- | ------- | ------------------------------------------ |
| `page`  | number  | 1       | Trang hiện tại                              |
| `limit` | number  | 20      | Số item/trang (max 50)                      |
| `isRead`| boolean | -       | Lọc theo trạng thái đã đọc/chưa đọc        |
| `type`  | string  | -       | Lọc theo loại thông báo (xem bảng bên dưới)|

**Response:**

```json
{
  "statusCode": 200,
  "data": {
    "items": [
      {
        "_id": "674abc123...",
        "recipientId": "674...",
        "type": "GUIDE_REGISTRATION_PENDING",
        "title": "Đơn đăng ký HDV mới",
        "message": "Nguyễn Văn A vừa đăng ký làm hướng dẫn viên, cần duyệt.",
        "metadata": { "guideId": "674...", "userId": "674..." },
        "isRead": false,
        "readAt": null,
        "link": "/admin/tour-guides/674...",
        "createdAt": "2026-03-10T08:30:00.000Z",
        "updatedAt": "2026-03-10T08:30:00.000Z"
      }
    ],
    "total": 5,
    "page": 1,
    "limit": 20
  }
}
```

---

### 2. Đếm số thông báo chưa đọc

```
GET /api/v1/notifications/unread-count
```

**Response:**

```json
{
  "statusCode": 200,
  "data": {
    "count": 3
  }
}
```

**Gợi ý FE:** Dùng để hiển thị badge trên icon chuông. Poll mỗi 30–60 giây hoặc sau khi user thực hiện action liên quan (vd: refresh trang).

---

### 3. Đánh dấu 1 thông báo đã đọc

```
PATCH /api/v1/notifications/:id/read
```

**Params:** `id` — `_id` của notification

**Response:**

```json
{
  "statusCode": 200,
  "data": {
    "_id": "674abc123...",
    "recipientId": "674...",
    "type": "GUIDE_REGISTRATION_PENDING",
    "title": "Đơn đăng ký HDV mới",
    "message": "...",
    "metadata": { "guideId": "674...", "userId": "674..." },
    "isRead": true,
    "readAt": "2026-03-10T09:00:00.000Z",
    "link": "/admin/tour-guides/674...",
    "createdAt": "2026-03-10T08:30:00.000Z",
    "updatedAt": "2026-03-10T09:00:00.000Z"
  }
}
```

**Lưu ý:** Chỉ đánh dấu được thông báo thuộc về chính user đang đăng nhập.

---

### 4. Đánh dấu tất cả đã đọc

```
PATCH /api/v1/notifications/read-all
```

**Response:**

```json
{
  "statusCode": 200,
  "data": {
    "modifiedCount": 5
  }
}
```

---

## Loại thông báo (Notification Type)

| Type                       | Mô tả                                      | Nhận bởi |
| -------------------------- | ------------------------------------------ | -------- |
| `GUIDE_REGISTRATION_PENDING` | Có đơn đăng ký HDV mới cần duyệt           | **Admin** |
| `GUIDE_VERIFIED`           | Hồ sơ HDV đã được admin duyệt              | **Client** (user là guide) |
| `GUIDE_REJECTED`           | Hồ sơ HDV chưa được duyệt                   | **Client** (user là guide) |

---

## FE Admin — Hướng dẫn áp dụng

### Thông báo Admin nhận

- **`GUIDE_REGISTRATION_PENDING`**: User đăng ký làm hướng dẫn viên → Admin cần vào trang quản lý tour guide để duyệt.

### Gợi ý triển khai

1. **Header / Sidebar**
   - Icon chuông + badge hiển thị `unread-count`
   - Click mở dropdown/drawer danh sách thông báo

2. **Polling**
   - Gọi `GET /notifications/unread-count` mỗi 30–60s khi user đang ở trang admin
   - Khi có thông báo mới → cập nhật badge, có thể thêm toast/alert

3. **Danh sách thông báo**
   - Gọi `GET /notifications?page=1&limit=20` để lấy danh sách
   - Dùng `metadata.guideId` và `link` để điều hướng khi user click

4. **Đánh dấu đã đọc**
   - Khi user click vào 1 thông báo: `PATCH /notifications/:id/read`
   - Nút "Đánh dấu tất cả đã đọc": `PATCH /notifications/read-all`

5. **Link điều hướng**
   - `link` trả về dạng `/admin/tour-guides/:guideId` — dùng để navigate đến trang chi tiết/duyệt HDV

---

## FE Client — Hướng dẫn áp dụng

### Thông báo Client (Guide) nhận

- **`GUIDE_VERIFIED`**: Admin đã duyệt hồ sơ HDV → Guide có thể nhận tour
- **`GUIDE_REJECTED`**: Admin chưa duyệt → Guide cần liên hệ hoặc cập nhật hồ sơ

### Gợi ý triển khai

1. **Header / Dashboard**
   - Icon chuông + badge `unread-count` (chỉ hiển thị khi user đã login)
   - Click mở dropdown/drawer danh sách thông báo

2. **Polling**
   - Gọi `GET /notifications/unread-count` mỗi 30–60s khi user đang đăng nhập
   - Có thể tăng tần suất khi user ở trang dashboard/guide

3. **Danh sách thông báo**
   - `GET /notifications?page=1&limit=20`
   - Hiển thị `title`, `message`, `createdAt`
   - Dùng `link` (vd: `/guide/my-profile`) để điều hướng khi click

4. **Đánh dấu đã đọc**
   - Tương tự Admin: `PATCH /notifications/:id/read` và `PATCH /notifications/read-all`

5. **Link điều hướng**
   - `link` thường là `/guide/my-profile` — trang hồ sơ HDV của user

---

## Flow tạo thông báo (tham khảo)

```
User đăng ký HDV (POST /tour-guides/register)
  → Backend emit event → Queue xử lý async
  → Tạo in-app notification cho tất cả Admin
  → Gửi email cho Admin (nếu có RESEND_API_KEY)

Admin duyệt HDV (PATCH /tour-guides/:id/verify)
  → Backend emit event → Queue xử lý async
  → Tạo in-app notification cho User (guide)
  → Gửi email cho User (nếu có email)
```

---

## Lưu ý

- **TTL**: Thông báo tự động xóa sau 90 ngày (MongoDB TTL index)
- **401**: Nếu chưa đăng nhập hoặc token hết hạn → cần redirect về trang login
- **Polling**: Không cần WebSocket; polling 30–60s là đủ cho UX thông thường
