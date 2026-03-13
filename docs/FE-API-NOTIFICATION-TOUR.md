## Notification API — Module Tour (Admin)

Tài liệu này mô tả **các loại thông báo liên quan đến Tour** dành cho **FE Admin**, bao gồm:

- **CRUD Tour** (tạo, cập nhật, xóa, publish/unpublish)
- **Inventory Tour**
- **Booking Tour**

_Không_ bao gồm phần **Review** theo yêu cầu.

Các notification này dùng chung hệ thống API đã mô tả trong `FE-API-NOTIFICATION.md`:

- **Base path**: `/api/v1/notifications`
- **Cơ chế**: Polling
- **Auth**: JWT (header `Authorization: Bearer <token>`)

Trong tất cả ví dụ bên dưới:

- Trường `title` và `message` đều là **i18n key** do BE trả về.
- FE cần dùng hệ thống i18n để translate key này sang text hiển thị.

---

## 1. Notification Type cho Tour — Tổng hợp

### 1.1. CRUD Tour

| Type                     | Khi nào bắn                                                                 | Nhận bởi   | i18n key `title`                                   | i18n key `message`                                   | Link điều hướng Admin                          | `metadata` gợi ý                                    |
| ------------------------ | --------------------------------------------------------------------------- | ---------- | -------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------- |
| `TOUR_CREATED`           | Tạo mới 1 tour thành công (qua form tạo tour)                              | **Admin**  | `notification.tour_created.title`                  | `notification.tour_created.message`                  | `/dashboard/tour/:tourId/edit`                     | `{ "tourId": "<id>" }`                             |
| `TOUR_UPDATED`           | Cập nhật thông tin tour (tên, mô tả, giá, lịch trình, ...)                 | **Admin**  | `notification.tour_updated.title`                  | `notification.tour_updated.message`                  | `/dashboard/tour/:tourId/edit`                     | `{ "tourId": "<id>" }`                             |
| `TOUR_DELETED`           | Xóa 1 tour khỏi hệ thống                                                   | **Admin**  | `notification.tour_deleted.title`                  | `notification.tour_deleted.message`                  | `/dashboard/tour`                                  | `{ "tourId": "<id>", "tourName": "<name>" }`       |
| `TOUR_PUBLISHED`         | Tour được chuyển sang trạng thái publish (có thể public lên FE client)     | **Admin**  | `notification.tour_published.title`                | `notification.tour_published.message`                | `/dashboard/tour/:tourId/edit`                     | `{ "tourId": "<id>" }`                             |
| `TOUR_UNPUBLISHED`       | Tour bị unpublish (ngưng hiển thị trên FE client)                          | **Admin**  | `notification.tour_unpublished.title`              | `notification.tour_unpublished.message`              | `/dashboard/tour/:tourId/edit`                     | `{ "tourId": "<id>" }`                             |

**Gợi ý nội dung i18n (tham khảo, BE chỉ trả về key):**

- `notification.tour_created.title`: "Tour mới đã được tạo"
- `notification.tour_created.message`: "Tour {{tourName}} đã được tạo thành công."

FE sẽ dùng `metadata.tourName` (nếu có) để binding vào template.

---

### 1.2. Inventory Tour

Liên quan tới route:

- Quản lý tồn kho tour: `GET /dashboard/tour/inventory`

| Type                        | Khi nào bắn                                                                                   | Nhận bởi  | i18n key `title`                                        | i18n key `message`                                        | Link điều hướng Admin                     | `metadata` gợi ý                                                           |
| --------------------------- | --------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------- |
| `TOUR_INVENTORY_LOW`        | Số lượng chỗ còn lại của 1 tour dưới ngưỡng cảnh báo (vd: < 5 chỗ)                           | **Admin** | `notification.tour_inventory_low.title`                 | `notification.tour_inventory_low.message`                 | `/dashboard/tour/inventory`               | `{ "tourId": "<id>", "tourName": "<name>", "remainingSlots": <number> }`   |
| `TOUR_INVENTORY_SOLD_OUT`   | Tour đã hết chỗ (sold out)                                                                   | **Admin** | `notification.tour_inventory_sold_out.title`            | `notification.tour_inventory_sold_out.message`            | `/dashboard/tour/inventory`               | `{ "tourId": "<id>", "tourName": "<name>" }`                               |
| `TOUR_INVENTORY_RESTOCKED`  | Admin/ hệ thống bổ sung thêm chỗ cho tour (tăng inventory từ 0 hoặc từ mức rất thấp lên)    | **Admin** | `notification.tour_inventory_restocked.title`           | `notification.tour_inventory_restocked.message`           | `/dashboard/tour/inventory`               | `{ "tourId": "<id>", "tourName": "<name>", "addedSlots": <number> }`       |

---

### 1.3. Booking Tour (Admin)

Liên quan tới route:

- Danh sách booking tour: `GET /dashboard/tour-bookings`
- Chi tiết booking tour: `GET /dashboard/tour-bookings/:id`

| Type                            | Khi nào bắn                                                                                         | Nhận bởi  | i18n key `title`                                            | i18n key `message`                                            | Link điều hướng Admin                          | `metadata` gợi ý                                                                 |
| ------------------------------- | --------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------ | ------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------- |
| `TOUR_BOOKING_CREATED`          | Có booking tour mới được tạo (user book trên FE client)                                            | **Admin** | `notification.tour_booking_created.title`                    | `notification.tour_booking_created.message`                    | `/dashboard/tour-bookings/:bookingId`          | `{ "bookingId": "<id>", "tourId": "<id>", "tourName": "<name>" }`           |
| `TOUR_BOOKING_CONFIRMED`        | Booking tour được admin/ hệ thống confirm (trạng thái chuyển sang CONFIRMED)                      | **Admin** | `notification.tour_booking_confirmed.title`                  | `notification.tour_booking_confirmed.message`                  | `/dashboard/tour-bookings/:bookingId`          | `{ "bookingId": "<id>", "tourId": "<id>", "tourName": "<name>" }`           |
| `TOUR_BOOKING_CANCELLED`        | Booking tour bị hủy (do user hoặc admin)                                                           | **Admin** | `notification.tour_booking_cancelled.title`                  | `notification.tour_booking_cancelled.message`                  | `/dashboard/tour-bookings/:bookingId`          | `{ "bookingId": "<id>", "tourId": "<id>", "tourName": "<name>" }`           |
| `TOUR_BOOKING_PAYMENT_FAILED`   | Thanh toán cho booking tour thất bại (payment gateway trả về fail)                                | **Admin** | `notification.tour_booking_payment_failed.title`            | `notification.tour_booking_payment_failed.message`            | `/dashboard/tour-bookings/:bookingId`          | `{ "bookingId": "<id>", "tourId": "<id>", "tourName": "<name>" }`           |
| `TOUR_BOOKING_OVERBOOKING`      | Có dấu hiệu overbooking (đặt vượt quá số chỗ còn lại, cần admin xử lý)                            | **Admin** | `notification.tour_booking_overbooking.title`               | `notification.tour_booking_overbooking.message`               | `/dashboard/tour-bookings/:bookingId`          | `{ "bookingId": "<id>", "tourId": "<id>", "tourName": "<name>" }`           |

---

## 2. Cấu trúc Notification trả về (sample)

Giống như `FE-API-NOTIFICATION.md`, ví dụ response khi lấy danh sách notification:

```json
{
  "statusCode": 200,
  "data": {
    "items": [
      {
        "_id": "675abc123...",
        "recipientId": "674...",
        "type": "TOUR_BOOKING_CREATED",
        "title": "notification.tour_booking_created.title",
        "message": "notification.tour_booking_created.message",
        "metadata": {
          "bookingId": "675...",
          "tourId": "123...",
          "tourName": "Tour Hà Giang 3N2Đ"
        },
        "isRead": false,
        "readAt": null,
        "link": "/dashboard/tour-bookings/675...",
        "createdAt": "2026-03-12T08:30:00.000Z",
        "updatedAt": "2026-03-12T08:30:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20
  }
}
```

**Lưu ý:**

- `title` và `message` là **key i18n**, FE không hiển thị trực tiếp mà phải qua hàm dịch (vd: `t(notification.title)`).
- `metadata` có thể thay đổi tùy type, FE nên check key trước khi sử dụng.
- `link` dùng để điều hướng nhanh tới màn hình tương ứng trong Admin:
  - Tour CRUD: `/dashboard/tour/:tourId/edit` hoặc `/dashboard/tour`
  - Inventory: `/dashboard/tour/inventory`
  - Booking tour: `/dashboard/tour-bookings/:bookingId` hoặc `/dashboard/tour-bookings`

---

## 3. Gợi ý triển khai cho FE Admin (Module Tour)

### 3.1. Badge & Polling

- **Badge thông báo**: dùng chung `GET /notifications/unread-count`.
- FE có thể tăng tần suất polling khi đang ở các trang:
  - `/dashboard/tour`
  - `/dashboard/tour/inventory`
  - `/dashboard/tour-bookings`

### 3.2. Mapping type → UI

- FE có thể map `type` sang:
  - Icon khác nhau (vd: tour icon, booking icon, warning icon cho inventory low/overbooking).
  - Màu sắc khác nhau (success, warning, danger).
- Ưu tiên hiển thị:
  - `TOUR_BOOKING_*` và `TOUR_INVENTORY_*` có thể được highlight cao hơn vì liên quan trực tiếp đến doanh thu/khả dụng.

### 3.3. Điều hướng từ notification

- Khi user click vào 1 notification:
  - Dùng `link` để `navigate` sang màn hình tương ứng.
  - Gọi `PATCH /notifications/:id/read` để đánh dấu đã đọc.

---

## 4. Tổng kết cho FE

- **Loại thông báo**: Xem bảng ở các mục 1.1, 1.2, 1.3.
- **Key i18n**:
  - FE chuẩn bị namespace `notification.*` tương ứng (tour, inventory, booking tour).
  - Dùng `title`/`message` như **key** chứ không phải text.
- **Điều hướng**: Sử dụng `link` trả về để điều hướng tới:
  - CRUD tour: `/dashboard/tour` / `/dashboard/tour/:id/edit`
  - Inventory: `/dashboard/tour/inventory`
  - Booking tour: `/dashboard/tour-bookings` / `/dashboard/tour-bookings/:id`

