# FE Admin - Audit Logs Page Design

## 1. Overview

Trang quản lý Audit Logs cho Admin panel, cho phép xem lịch sử hoạt động hệ thống bao gồm AUTH (đăng nhập, đăng ký, ...), CRUD (tạo/sửa/xóa tài nguyên), và PAYMENT (thanh toán, hoàn tiền, ...).

---

## 2. API Contract

### 2.1 List Audit Logs

```
GET /api/v1/audit-logs
Authorization: Bearer <admin_token>
```

**Query Parameters:**

| Parameter    | Type   | Required | Default    | Description                              |
|-------------|--------|----------|------------|------------------------------------------|
| userId      | string | No       | -          | Filter theo ObjectId của user            |
| category    | string | No       | -          | `AUTH` / `CRUD` / `PAYMENT`              |
| action      | string | No       | -          | Enum value cụ thể (vd: `USER_LOGIN`)    |
| resourceType| string | No       | -          | `USER` / `TOUR` / `HOTEL` / ...         |
| ip          | string | No       | -          | Filter theo IP address                   |
| fromDate    | string | No       | -          | ISO date string (vd: `2026-04-01`)       |
| toDate      | string | No       | -          | ISO date string (vd: `2026-04-22`)       |
| page        | number | No       | 1          | Trang hiện tại                           |
| limit       | number | No       | 20         | Số lượng mỗi trang (max: 100)           |
| sortBy      | string | No       | createdAt  | Field sắp xếp                            |
| sortOrder   | string | No       | desc       | `asc` / `desc`                           |

**Response:**

```json
{
  "statusCode": 200,
  "status": true,
  "timestamp": "2026-04-22T10:00:00.000Z",
  "data": {
    "data": [
      {
        "_id": "662a...",
        "category": "AUTH",
        "action": "USER_LOGIN",
        "resourceType": "AUTH_SESSION",
        "resourceId": null,
        "userId": "661f...",
        "username": "admin",
        "ip": "42.112.211.265",
        "userAgent": "Mozilla/5.0 ...",
        "oldValue": null,
        "newValue": null,
        "description": null,
        "metadata": null,
        "createdAt": "2026-04-22T10:23:05.000Z",
        "updatedAt": "2026-04-22T10:23:05.000Z"
      }
    ],
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  },
  "message": "success"
}
```

### 2.2 Audit Log Detail

```
GET /api/v1/audit-logs/:id
Authorization: Bearer <admin_token>
```

**Response:** Single audit log object (same structure as list item).

### 2.3 Export

```
GET /api/v1/audit-logs/export?format=csv
GET /api/v1/audit-logs/export?format=xlsx
Authorization: Bearer <admin_token>
```

Hỗ trợ tất cả filter params như list API (trừ `page`/`limit`). Response là file download.

---

## 3. Enum Values cho Dropdowns

### Category (Loại sự kiện)

| Value     | Label (vi)     |
|-----------|---------------|
| AUTH      | Xác thực      |
| CRUD      | Dữ liệu      |
| PAYMENT   | Thanh toán    |

### Action - AUTH

| Value                   | Label (vi)                    | Icon      | Color   |
|------------------------|-------------------------------|-----------|---------|
| USER_LOGIN             | Đăng nhập                     | LogIn     | green   |
| USER_LOGIN_FAILED      | Đăng nhập thất bại            | LogIn     | red     |
| USER_REGISTER          | Đăng ký tài khoản             | UserPlus  | green   |
| USER_LOGOUT            | Đăng xuất                     | LogOut    | gray    |
| USER_LOGOUT_ALL        | Đăng xuất tất cả thiết bị     | LogOut    | orange  |
| PASSWORD_RESET_REQUEST | Yêu cầu đặt lại mật khẩu     | Key       | yellow  |
| PASSWORD_RESET_CONFIRM | Xác nhận đặt lại mật khẩu    | Key       | green   |
| TOKEN_REFRESH          | *(reserved — không log)*      | RefreshCw | —       |
| TOKEN_REUSE_DETECTED   | Phát hiện tái sử dụng token   | AlertTriangle | red  |

**Ghi chú `TOKEN_REFRESH`:** Backend **không** ghi audit khi refresh token thành công. Lý do: mỗi lần reload trang / silent refresh sẽ tạo hàng loạt bản ghi trùng lặp, ít giá trị so với login/logout. Enum vẫn tồn tại để tương thích; chỉ có sự kiện bảo mật (ví dụ `TOKEN_REUSE_DETECTED`) được ghi đầy đủ.

### Action - CRUD

| Value              | Label (vi)       | Icon       | Color   |
|-------------------|-----------------|------------|---------|
| RESOURCE_CREATED  | Tạo mới         | Plus       | green   |
| RESOURCE_UPDATED  | Cập nhật        | Edit       | blue    |
| RESOURCE_DELETED  | Xóa             | Trash      | red     |
| RESOURCE_SOFT_DELETED | Xóa mềm    | Archive    | orange  |
| RESOURCE_RESTORED | Khôi phục       | RotateCcw  | green   |

### Action - PAYMENT

| Value                    | Label (vi)                | Icon         | Color   |
|-------------------------|--------------------------|-------------|---------|
| PAYMENT_INTENT_CREATED  | Tạo yêu cầu thanh toán  | CreditCard  | blue    |
| PAYMENT_SUCCEEDED       | Thanh toán thành công    | CheckCircle | green   |
| PAYMENT_FAILED          | Thanh toán thất bại      | XCircle     | red     |
| PAYMENT_REFUNDED        | Hoàn tiền                | ArrowLeft   | orange  |
| PAYMENT_EXPIRED         | Hết hạn thanh toán       | Clock       | gray    |
| PAYMENT_CANCELLED       | Hủy thanh toán           | X           | red     |

### Resource Type (Loại tài nguyên)

| Value         | Label (vi)       |
|---------------|-----------------|
| USER          | Người dùng      |
| TOUR          | Tour            |
| HOTEL         | Khách sạn       |
| ROOM          | Phòng           |
| BOOKING       | Đặt phòng       |
| TOUR_BOOKING  | Đặt tour        |
| REVIEW        | Đánh giá        |
| TOUR_GUIDE    | Hướng dẫn viên  |
| PAYMENT       | Thanh toán      |
| AUTH_SESSION  | Phiên đăng nhập |

---

## 4. UI Layout

### 4.1 Page Structure

```
+------------------------------------------------------------------------+
| Breadcrumb: Trang chủ > Audit Logs                                      |
+------------------------------------------------------------------------+
|                                                                          |
| [Filter Bar]                                            [Export Button]  |
| +--------------------------------------------------------------------+  |
| | [User ▼] [Category ▼] [Resource ▼] [IP ______] [From 📅] ~ [To 📅] | |
| +--------------------------------------------------------------------+  |
|                                                                          |
| +--------------------------------------------------------------------+  |
| | Log Entry Card                                                      |  |
| | ┌──────────────────────────────────────────────────────────────┐   |  |
| | │ [●] Đăng nhập                                                │   |  |
| | │     USER_LOGIN                                                │   |  |
| | │     👤 Admin User                                             │   |  |
| | │     📅 4/22/2026, 10:23:05 AM    IP: 42.112.211.265         │   |  |
| | └──────────────────────────────────────────────────────────────┘   |  |
| |                                                                     |  |
| | ┌──────────────────────────────────────────────────────────────┐   |  |
| | │ [●] Cập nhật tour                                            │   |  |
| | │     RESOURCE_UPDATED                                          │   |  |
| | │     👤 Admin User   📁 TOUR                                  │   |  |
| | │     📅 4/22/2026, 09:15:00 AM    IP: 42.112.211.265         │   |  |
| | └──────────────────────────────────────────────────────────────┘   |  |
| +--------------------------------------------------------------------+  |
|                                                                          |
| [Pagination: < 1 2 3 ... 8 >]                                          |
+------------------------------------------------------------------------+
```

### 4.2 Filter Bar

- **Nguoi dung**: Searchable select dropdown, goi `GET /api/v1/users` de lay danh sach user
- **Loai su kien**: Multi-level select
  - Level 1: Category (AUTH / CRUD / PAYMENT)
  - Level 2: Action tuong ung (khi chon category, load actions cua category do)
- **Loai tai nguyen**: Select dropdown voi AuditResourceType enum values
- **Dia chi IP**: Text input, free-text
- **Khoang thoi gian**: Date range picker (fromDate ~ toDate)

### 4.3 Export Button

- Click vao nut "Xuat" hien dropdown: "CSV" va "Excel"
- Call API export voi cac filter hien tai
- Download file truc tiep

### 4.4 Log Entry Card

Moi card hien thi:

```
[Category Icon] [Action Label (vi)]
               [Action Code]              <- monospace, nhạt hơn
               👤 [Username]  📁 [Resource Type Label]  <- chỉ hiện resource type nếu có
               📅 [Formatted Date]   IP: [IP Address]
```

**Category Icon & Color:**
- AUTH: Mau xanh la (green-500) - icon Shield/Lock
- CRUD: Mau xanh duong (blue-500) - icon Database
- PAYMENT: Mau tim (purple-500) - icon CreditCard

**Card background:** Dark card (tuong tu screenshot - `bg-gray-800/50` hoac `bg-neutral-900`)

### 4.5 Detail Drawer

Khi click vao 1 log entry, mo drawer (slide from right) hien thi:

```
+----------------------------------+
| Audit Log Detail           [X]   |
|----------------------------------|
| Category:    AUTH                 |
| Action:      USER_LOGIN          |
| User:        Admin User          |
| IP:          42.112.211.265      |
| User Agent:  Mozilla/5.0 ...     |
| Resource:    AUTH_SESSION         |
| Resource ID: -                   |
| Timestamp:   4/22/2026 10:23 AM  |
|----------------------------------|
| Old Value:                        |
| (none)                            |
|----------------------------------|
| New Value:                        |
| (none)                            |
|----------------------------------|
| Metadata:                         |
| (none)                            |
+----------------------------------+
```

**Voi CRUD RESOURCE_UPDATED**, hien thi diff:

```
+----------------------------------+
| Changes:                          |
|  name:                            |
|    - "Tour Ha Long Bay"           |
|    + "Tour Vinh Ha Long Premium"  |
|  price:                           |
|    - 500000                       |
|    + 650000                       |
+----------------------------------+
```

Dung diff view: old value highlight do, new value highlight xanh.

---

## 5. Component Structure (goi y)

```
AuditLogsPage/
  AuditLogsPage.tsx          -- Main page component
  AuditLogFilter.tsx         -- Filter bar component
  AuditLogList.tsx           -- List container
  AuditLogCard.tsx           -- Single log entry card
  AuditLogDetailDrawer.tsx   -- Detail side drawer
  AuditLogExportButton.tsx   -- Export dropdown button
  AuditLogDiffView.tsx       -- Old/New value diff display
  hooks/
    useAuditLogs.ts          -- React Query hook for fetching logs
    useAuditLogExport.ts     -- Export download hook
  constants/
    audit-log.constants.ts   -- Label/icon/color mappings for enums
```

---

## 6. State Management

- Dung React Query (TanStack Query) cho data fetching va caching
- Filter state luu trong URL search params (de bookmark/share duoc)
- Pagination: server-side, dung `page` va `limit` query params

---

## 7. Responsive Design

- **Desktop (>= 1024px)**: Full filter bar tren 1 dong, list cards full width
- **Tablet (768-1023px)**: Filter bar wrap 2 dong, cards full width
- **Mobile (< 768px)**: Filter bar xep doc (stacked), moi filter 1 dong. Cards simplified - an userAgent, IP thu gon.

---

## 8. Performance

- Pagination server-side (khong load het)
- Debounce input IP filter (300ms)
- React Query staleTime: 30s (audit logs khong can real-time)
- Export: show loading spinner khi dang generate file

---

## 9. Empty State

Khi khong co audit log nao:

```
+--------------------------------------------+
|                                              |
|    [Icon: ClipboardList]                     |
|    Chưa có nhật ký hoạt động nào             |
|    Các hoạt động của hệ thống sẽ được        |
|    ghi nhận tại đây.                         |
|                                              |
+--------------------------------------------+
```

---

## 10. Error Handling

- API error: Hien toast notification voi message loi
- Network error: Hien retry button
- 403 Forbidden: Redirect ve dashboard voi thong bao "Khong co quyen truy cap"
