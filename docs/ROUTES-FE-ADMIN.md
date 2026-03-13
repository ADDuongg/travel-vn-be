## Tổng hợp route theo module

**Lưu ý**: Đây là file tổng hợp để tra cứu nhanh, không tham gia trực tiếp vào hệ thống routing. Nguồn dữ liệu lấy từ `src/router.tsx` và `src/constants/route.constant.ts`.

### Auth
- **Root redirect**: `/` → chuyển hướng sang `/dashboard`
- **Login**: `/login`

### Dashboard (layout chính)
- **Dashboard**:
  - `GET /dashboard` (index) → màn hình Dashboard

### Tour
- **Danh sách tour**:
  - `GET /dashboard/tour`
- **Tạo mới tour**:
  - `GET /dashboard/tour/create`
- **Chỉnh sửa tour**:
  - `GET /dashboard/tour/:id/edit`
- **Quản lý tồn kho tour**:
  - `GET /dashboard/tour/inventory`

### Tour Booking
- **Danh sách booking tour**:
  - `GET /dashboard/tour-bookings`
- **Chi tiết booking tour**:
  - `GET /dashboard/tour-bookings/:id`

### Province
- **Danh sách tỉnh/thành**:
  - `GET /dashboard/provinces`

### Tour Guide
- **Danh sách hướng dẫn viên**:
  - `GET /dashboard/tour-guides`

### Hotel
- **Danh sách khách sạn**:
  - `GET /dashboard/hotel`
- **Tạo mới khách sạn**:
  - `GET /dashboard/hotel/create`
- **Chỉnh sửa khách sạn**:
  - `GET /dashboard/hotel/:id/edit`

### Room
- **Danh sách phòng**:
  - `GET /dashboard/room`
- **Chi tiết phòng**:
  - `GET /dashboard/room/:id`
- **Tạo mới phòng**:
  - `GET /dashboard/room/create`
- **Chỉnh sửa phòng**:
  - `GET /dashboard/room/:id/edit`
- **Tiện nghi phòng (Amenities)**:
  - `GET /dashboard/room/amenities`

### Booking (tổng quát)
- **Danh sách booking**:
  - `GET /dashboard/bookings`
- **Chi tiết booking**:
  - `GET /dashboard/bookings/:id`

### Review
- **Danh sách review admin (tổng quát)**:
  - `GET /dashboard/reviews`
- **Review tour (filter qua query)**:
  - `GET /dashboard/reviews?entityType=TOUR`

### Province
- **Danh sách tỉnh/thành**:
  - `GET /dashboard/provinces`

### Tour Guide
- **Danh sách hướng dẫn viên**:
  - `GET /dashboard/tour-guides`

### System
- **Cấu hình hệ thống**:
  - `GET /dashboard/system`
- **Ngôn ngữ hệ thống**:
  - `GET /dashboard/system/languages`

### Role & Permission
- **Phân quyền, vai trò**:
  - `GET /dashboard/role-permission`

### Account
- **Thông tin tài khoản**:
  - `GET /dashboard/account`

