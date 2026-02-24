# Tour API - Phase 2: Booking System (FE Documentation)

## Base URL
```
http://localhost:3000/api/v1
```

---

## 📋 Tổng quan Phase 2

Phase 2 bổ sung **hệ thống đặt tour**:

1. **Tour Inventory** – Quản lý số chỗ theo từng ngày khởi hành (availability, block/release).
2. **Tour Booking** – Đặt tour, mã đặt chỗ, khách, thanh toán (deposit/full), trạng thái.

**Dành cho:**
- **FE Client**: Trang chi tiết tour (xem availability theo tháng), form đặt tour, tra cứu đơn bằng mã, "Đơn của tôi", thanh toán.
- **FE Admin**: Tạo/cập nhật inventory theo ngày, danh sách đơn tour, xác nhận/hủy, ghi nhận thanh toán.

---

## 🔐 Authentication

| Endpoint | Auth | Ghi chú |
|----------|------|--------|
| GET tours/:id/availability | Public | Xem số chỗ theo tháng |
| GET tour-inventory/tours/:tourId/availability | Public | Cùng nội dung, path khác |
| POST tour-inventory/block | Public/Internal | Thường gọi nội bộ khi tạo booking |
| POST tour-inventory/release | Public/Internal | Thường gọi khi hủy booking |
| POST tour-inventory/ensure | **Bearer (Admin)** | Tạo/cập nhật inventory theo ngày |
| POST tour-bookings | **Bearer** | Đặt tour (userId lấy từ JWT, không gửi trong body) |
| GET tour-bookings/by-code/:code | Public | Tra cứu đơn theo mã |
| GET tour-bookings/my-bookings | **Bearer** | Đơn của user đăng nhập |
| GET tour-bookings/my-bookings/:code | **Bearer** | Chi tiết 1 đơn của user |
| GET tour-bookings/admin | **Bearer (Admin)** | Danh sách đơn (admin) |
| GET tour-bookings/:id | Public/Admin | Chi tiết theo ID (ObjectId) |
| PATCH tour-bookings/:id/confirm | Admin | Xác nhận đơn |
| PATCH tour-bookings/:id/cancel | **Bearer** | Hủy đơn: chỉ chủ đơn hoặc admin (user hủy đơn mình, admin hủy mọi đơn) |
| POST tour-bookings/:id/payment | Admin | Ghi nhận thanh toán |

---

## 📚 1. Tour Availability (số chỗ theo tháng)

### 1.1 GET `/api/v1/tours/:id/availability` (Public)

Xem số chỗ còn lại theo từng ngày trong tháng (dùng cho calendar/date picker).

**Params:** `id` – Tour ID (MongoDB ObjectId).

**Query:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| month | string | Tháng hiện tại | Định dạng `YYYY-MM` (vd: `2025-03`) |

**Response:**
```json
[
  {
    "departureDate": "2025-03-01",
    "availableSlots": 15,
    "totalSlots": 20,
    "status": "AVAILABLE",
    "specialPrice": null,
    "currency": "VND"
  },
  {
    "departureDate": "2025-03-08",
    "availableSlots": 3,
    "totalSlots": 20,
    "status": "LIMITED",
    "specialPrice": 2790000,
    "currency": "VND"
  },
  {
    "departureDate": "2025-03-15",
    "availableSlots": 0,
    "totalSlots": 20,
    "status": "FULL",
    "specialPrice": null,
    "currency": "VND"
  }
]
```

**Status:** `AVAILABLE` | `LIMITED` (≤20% chỗ) | `FULL` | `CANCELLED` (không trả về trong list).

---

### 1.2 GET `/api/v1/tour-inventory/tours/:tourId/availability` (Public)

Cùng dữ liệu với 1.1, path thay thế (query `month` giống trên).

---

## 📚 2. Tour Inventory (Admin / Internal)

### 2.1 POST `/api/v1/tour-inventory/block` (Internal)

Giảm số chỗ (gọi khi tạo booking). FE thường không gọi trực tiếp; backend gọi khi tạo tour booking.

**Body:**
```json
{
  "tourId": "675abc123...",
  "departureDate": "2025-03-08",
  "slots": 4
}
```

**Response:** Document TourInventory (MongoDB) sau khi cập nhật.

---

### 2.2 POST `/api/v1/tour-inventory/release` (Internal)

Trả lại số chỗ (gọi khi hủy booking).

**Body:**
```json
{
  "tourId": "675abc123...",
  "departureDate": "2025-03-08",
  "slots": 4
}
```

---

### 2.3 POST `/api/v1/tour-inventory/ensure` (Admin, Bearer)

Tạo hoặc cập nhật inventory cho **một ngày khởi hành** (số chỗ, giá đặc biệt tùy chọn).

**Body:**
```json
{
  "tourId": "675abc123...",
  "departureDate": "2025-03-08",
  "totalSlots": 20,
  "specialPrice": 2790000
}
```

| Field | Type | Bắt buộc | Mô tả |
|-------|------|----------|--------|
| tourId | string | Có | Tour ID |
| departureDate | string | Có | Ngày khởi hành (YYYY-MM-DD) |
| totalSlots | number | Có | Tổng số chỗ (1 → maxGuests của tour) |
| specialPrice | number | Không | Giá đặc biệt theo ngày (VND); bỏ qua thì dùng giá tour |

**Response:** Document TourInventory.

---

## 📚 3. Tour Booking

### 3.1 POST `/api/v1/tour-bookings` (Bearer – bắt buộc đăng nhập)

Tạo đặt tour. **Header:** `Authorization: Bearer <token>`. Backend lấy `userId` từ JWT, không nhận từ body.

**Body:** (không gửi `userId`)
```json
{
  "tourId": "675abc123...",
  "departureDate": "2025-03-08",
  "guest": {
    "fullName": "Nguyễn Văn A",
    "email": "customer@example.com",
    "phone": "0901234567",
    "note": "Ăn chay"
  },
  "adults": 2,
  "children": 1,
  "infants": 0
}
```

| Field | Type | Bắt buộc | Mô tả |
|-------|------|----------|--------|
| tourId | string | Có | Tour ID |
| departureDate | string | Có | YYYY-MM-DD |
| guest | object | Có | fullName, email; phone, note tùy chọn |
| adults | number | Có | ≥ 1 |
| children | number | Không | Mặc định 0 |
| infants | number | Không | Mặc định 0 |

**Response:**
```json
{
  "_id": "675booking...",
  "bookingCode": "TB-A1B2C3D4",
  "tourId": { "_id": "...", "code": "TOUR-SAPA-001", "slug": "...", "translations": {...}, "duration": {...}, "pricing": {...} },
  "tourInventoryId": { "_id": "...", "departureDate": "2025-03-08T00:00:00.000Z", ... },
  "guest": { "fullName": "Nguyễn Văn A", "email": "customer@example.com", "phone": "0901234567", "note": "Ăn chay" },
  "adults": 2,
  "children": 1,
  "infants": 0,
  "departureDate": "2025-03-08T00:00:00.000Z",
  "totalAmount": 8500000,
  "currency": "VND",
  "depositAmount": 2550000,
  "paidAmount": 0,
  "status": "PENDING",
  "createdAt": "2025-02-20T10:00:00.000Z",
  "updatedAt": "2025-02-20T10:00:00.000Z"
}
```

**Logic backend:**
- Kiểm tra tour tồn tại, có inventory cho `departureDate`, đủ chỗ.
- Tính tiền: adults/children/infants theo giá tour (hoặc specialPrice nếu có).
- Deposit = totalAmount * depositPercent (bookingConfig).
- Tự block slots (gọi block) khi tạo thành công.

---

### 3.2 GET `/api/v1/tour-bookings/by-code/:code` (Public)

Tra cứu đơn theo **mã đặt chỗ** (khách nhập mã trên web).

**Params:** `code` – bookingCode (vd: `TB-A1B2C3D4`), không phân biệt hoa thường.

**Response:** Cùng cấu trúc đơn như 3.1 (có populate tourId, tourInventoryId).

---

### 3.3 GET `/api/v1/tour-bookings/my-bookings` (Bearer)

Danh sách đơn của user đăng nhập.

**Query:**

| Parameter | Type | Default | Mô tả |
|-----------|------|---------|--------|
| page | number | 1 | Trang |
| limit | number | 10 | Số dòng/trang |

**Response:**
```json
{
  "items": [
    {
      "_id": "...",
      "bookingCode": "TB-A1B2C3D4",
      "tourId": { "code": "...", "slug": "...", "translations": {...}, "duration": {...} },
      "departureDate": "2025-03-08T00:00:00.000Z",
      "totalAmount": 8500000,
      "status": "PENDING",
      "createdAt": "..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1
  }
}
```

---

### 3.4 GET `/api/v1/tour-bookings/my-bookings/:code` (Bearer)

Chi tiết một đơn của user (theo mã), đảm bảo `userId` trùng với token.

**Params:** `code` – bookingCode.

---

### 3.5 GET `/api/v1/tour-bookings/admin` (Admin, Bearer)

Danh sách đơn cho Admin (phân trang, lọc trạng thái).

**Query:**

| Parameter | Type | Default | Mô tả |
|-----------|------|---------|--------|
| page | number | 1 | Trang |
| limit | number | 20 | Số dòng/trang |
| status | string | - | `PENDING` \| `CONFIRMED` \| `PAID` \| `CANCELLED` \| `COMPLETED` |

**Response:** Cùng dạng `{ items, pagination }` như 3.3 (items có thêm thông tin tour, inventory).

---

### 3.6 GET `/api/v1/tour-bookings/:id` (Public/Admin)

Chi tiết đơn theo **MongoDB _id** (ObjectId). Dùng khi đã có id (vd từ admin list).

**Params:** `id` – TourBooking _id.

---

### 3.7 PATCH `/api/v1/tour-bookings/:id/confirm` (Admin)

Xác nhận đơn (chuyển PENDING → CONFIRMED).

**Params:** `id` – TourBooking _id.

**Response:** Document TourBooking sau khi cập nhật.

---

### 3.8 PATCH `/api/v1/tour-bookings/:id/cancel` (Admin/User)

Hủy đơn. Backend sẽ release slots (gọi release).

**Params:** `id` – TourBooking _id.

**Body (tùy chọn):**
```json
{
  "reason": "Khách đổi lịch"
}
```

**Response:** Document TourBooking (status = CANCELLED, cancelledAt, cancelReason).

---

### 3.9 POST `/api/v1/tour-bookings/:id/payment` (Admin)

Ghi nhận thanh toán (tiền mặt, chuyển khoản, ...).

**Params:** `id` – TourBooking _id.

**Body:**
```json
{
  "amount": 2550000,
  "provider": "BANK_TRANSFER",
  "transactionId": "FT250220001"
}
```

| Field | Type | Bắt buộc | Mô tả |
|-------|------|----------|--------|
| amount | number | Có | Số tiền thanh toán (VND) |
| provider | string | Không | Kênh: BANK_TRANSFER, VNPay, Momo, CASH, ... |
| transactionId | string | Không | Mã giao dịch |

**Logic:**
- `paidAmount += amount`.
- Nếu `paidAmount >= totalAmount` → status = `PAID`, `paidAt` = now.
- Nếu `paidAmount >= depositAmount` → status = `CONFIRMED` (nếu chưa PAID).

**Response:** Document TourBooking.

---

## 📊 Trạng thái đơn (Booking Status)

| Status | Mô tả |
|--------|--------|
| PENDING | Mới tạo, chưa xác nhận |
| CONFIRMED | Đã xác nhận (có thể đã đặt cọc) |
| PAID | Đã thanh toán đủ |
| CANCELLED | Đã hủy |
| COMPLETED | Đã hoàn thành (tour đã đi) |

---

## 📋 Checklist cập nhật FE

### FE Client
- [ ] Trang chi tiết tour: gọi **GET** `/api/v1/tours/:id/availability?month=YYYY-MM` để hiển thị calendar/số chỗ theo tháng.
- [ ] Form đặt tour: **user phải đăng nhập**, gửi kèm **Bearer token**; chọn ngày (chỉ hiển thị ngày có `availableSlots > 0`), nhập thông tin khách (guest), adults/children/infants; gửi **POST** `/api/v1/tour-bookings` (không gửi `userId` trong body).
- [ ] Sau khi đặt: hiển thị **bookingCode** và link tra cứu đơn.
- [ ] Trang tra cứu đơn: input mã → **GET** `/api/v1/tour-bookings/by-code/:code`.
- [ ] Trang "Đơn của tôi" (khi đã login): **GET** `/api/v1/tour-bookings/my-bookings` (và chi tiết bằng **GET** `my-bookings/:code`).
- [ ] (Tùy product) Nút hủy đơn: **PATCH** `/api/v1/tour-bookings/:id/cancel` (cần truyền id hoặc lấy từ chi tiết đơn).

### FE Admin
- [ ] Quản lý inventory: form theo tour + ngày khởi hành, nhập totalSlots (và specialPrice nếu có) → **POST** `/api/v1/tour-inventory/ensure` (Bearer).
- [ ] Danh sách đơn tour: **GET** `/api/v1/tour-bookings/admin?page=&limit=&status=`.
- [ ] Chi tiết đơn: **GET** `/api/v1/tour-bookings/:id`.
- [ ] Xác nhận đơn: **PATCH** `/api/v1/tour-bookings/:id/confirm`.
- [ ] Hủy đơn: **PATCH** `/api/v1/tour-bookings/:id/cancel` (body reason tùy chọn).
- [ ] Ghi nhận thanh toán: **POST** `/api/v1/tour-bookings/:id/payment` (amount, provider, transactionId).

---

## ⚠️ Lỗi thường gặp

| HTTP | Message | Ý nghĩa |
|------|---------|--------|
| 400 | Invalid tour ID / Invalid month format | ID hoặc tháng không hợp lệ |
| 400 | No availability for this tour on the selected date | Chưa có inventory cho ngày đó (Admin cần ensure) |
| 400 | Not enough slots | Số khách vượt availableSlots |
| 400 | Only PENDING bookings can be confirmed | Chỉ xác nhận đơn PENDING |
| 404 | Tour not found / Booking not found | Không tìm thấy tour hoặc đơn |
| 401 | Unauthorized | Thiếu hoặc sai token |

---

## 📝 Liên quan Phase 1

- Tour schema (capacity, pricing, bookingConfig) được dùng để validate và tính tiền khi đặt tour.
- Chi tiết tour: tiếp tục dùng **GET** `/api/v1/tours/:id` và **GET** `/api/v1/tours/slug/:slug` như trong `docs/FE-API-TOUR.md`.

---

**Version:** 1.0.0 (Phase 2)  
**Last Updated:** 2025-02-23
