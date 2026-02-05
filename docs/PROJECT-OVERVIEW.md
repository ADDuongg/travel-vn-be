# VN Tours Backend (NestJS) — Project Overview

## 1) Mục tiêu dự án

Backend này là “single source of truth” cho một nền tảng du lịch, phục vụ **FE Client** và **FE Admin**, bao gồm:

- **Tour**: quản lý tour, tìm kiếm/lọc, nội dung đa ngôn ngữ, media, rating.
- **Lưu trú**: provinces → hotels → rooms, kèm inventory/availability và booking.
- **E-commerce**: product → orders → payment (Stripe), idempotency cho các request nhạy cảm.
- **Nền tảng chung**: auth (JWT), roles/permissions, upload/media (Cloudinary), realtime updates (Socket.IO), Swagger.

Trong giai đoạn tiếp theo dự án sẽ mở rộng:

- **Show/Discovery món ăn nổi tiếng theo địa phương** (liên kết theo tỉnh/thành, hỗ trợ đa ngôn ngữ & SEO).
- **E-commerce đồ du lịch** (mở rộng catalogue sản phẩm, tồn kho, vận chuyển, khuyến mãi…).

---

## 2) Tech stack & nền tảng kỹ thuật

- **Framework**: NestJS (TypeScript)
- **Database**: MongoDB + Mongoose
- **Validation**: `class-validator`/`class-transformer` (DTO), có `ZodValidationPipe` cho use-case cần schema mạnh
- **API Docs**: Swagger tại route `/api`
- **Payments**: Stripe (có webhook endpoint raw body)
- **Media**: Cloudinary + upload
- **Realtime**: Socket.IO (server gateway)
- **Scheduling**: `@nestjs/schedule` (cron/background jobs)

---

## 3) Kiến trúc & convention

- **Module-based**: mỗi domain là một module độc lập (controller/service/schema/dto/types).
- **Controller mỏng**: nhận request → validate DTO → gọi service → trả response.
- **Service chứa business logic**: query/aggregate/populate, tính toán nghiệp vụ, orchestration liên module.
- **Response chuẩn hoá**:
  - Global interceptor `ResponseTransformInterceptor` (format response)
  - Global filter `HttpExceptionFilter` (format lỗi)
- **DTO Validation**: global `ValidationPipe({ whitelist: true, transform: true })`.
- **API prefix**: đa số endpoint theo pattern `/api/v1/...` (xem docs FE).
- **CORS**: bật cho dev origins (Vite ports 5173/5174).

---

## 4) Module hiện có (high-level)

### Core nền tảng
- **`auth` / `user`**: đăng ký/đăng nhập, JWT, refresh token (schema `refresh_token`).
- **`roles` / `permission` / `api-role` / `api-permission` / `routers` / `router-role`**: hệ thống phân quyền theo role/permission và mapping router (phù hợp Admin).
- **`language`**: hỗ trợ i18n data theo `translations` (vi/en/…).

### Địa lý & nội dung
- **`provinces`**: danh mục tỉnh/thành phục vụ dropdown, liên kết với hotel/tour.
- **`media` / `upload` / `cloudinary`**: quản lý upload & lưu trữ ảnh/video.

### Tour
- **`tour`**: CRUD + query nâng cao (filter/sort/search/pagination), đa ngôn ngữ, quan hệ provinces, gallery, pricing, sale, rating summary.
  - Tài liệu FE: `docs/FE-API-TOUR.md`
  - Kế hoạch mở rộng: `plans/TOUR-MODULE-PLAN.md`

### Lưu trú
- **`hotel`**: provinces → hotels (đa ngôn ngữ, amenities, media, contact/location).
- **`room`**: rooms thuộc hotel, hỗ trợ filter theo province/hotelIds/giá/sức chứa/amenities/availability.
- **`room-inventory`**: tiện ích/logic liên quan tồn phòng theo ngày (tuỳ scope hiện tại).
- **`booking`**: luồng đặt phòng (tuỳ phạm vi hiện tại).
  - Tổng quan thay đổi API cho FE: `docs/FE-API-CHANGES.md`

### E-commerce & thanh toán
- **`product`**: danh mục sản phẩm (hiện dùng cho travel-related products).
- **`orders`**: tạo & quản lý đơn hàng.
- **`payment`**: thanh toán, xử lý trạng thái, webhook Stripe.
- **`idempotency`**: hỗ trợ chống double-submit cho các request tạo đơn/thanh toán (qua header `Idempotency-Key`).

### Realtime
- **`socket`**: bắn sự kiện realtime (booking/payment/inventory updates).

---

## 5) Dữ liệu & model patterns (đang dùng trong dự án)

- **Đa ngôn ngữ**: field dạng `translations: Record<string, {...}>` (thường có `vi`, `en`).
- **SEO-friendly**: dùng `slug` (và/hoặc `code`) cho lookup, nhiều schema có index unique.
- **Soft delete / visibility**: pattern `isActive` để bật/tắt hiển thị.
- **Quan hệ tỉnh/thành**:
  - Hotel: `provinceId`
  - Room: `hotelId` (populate hotel + province)
  - Tour: `destinations[].provinceId`, `departureProvinceId`

---

## 6) Local development (gợi ý)

- **Cài deps**: `yarn install`
- **Chạy dev**: `yarn start:dev`
- **Swagger**: mở `/api`
- **DB**: set `DB_URI` trong `.env` (dự án dùng `ConfigModule` đọc `.env`)
- **Stripe webhook**: endpoint `POST /payments/webhook/stripe` (raw body)
- **Provinces data**:
  - `provinces.mongo.json` là dữ liệu import cho MongoDB (phục vụ dropdown/province relationship)
  - Script chuyển đổi: `yarn provinces:transform`

---

## 7) Roadmap đề xuất (sắp làm)

### 7.1) “Món ăn nổi tiếng theo địa phương” (Food Discovery)

**Mục tiêu**: hiển thị/khám phá món ăn theo tỉnh/thành (và có thể theo quận/huyện nếu cần), hỗ trợ SEO, media, và liên kết sang tour/hotel.

**Đề xuất module**: `food/`

**Schema gợi ý (tối giản)**:
- `FoodItem`:
  - `slug`, `isActive`
  - `provinceId` (ref `Province`)
  - `translations` (vi/en: `name`, `shortDescription`, `description`, `seo`)
  - `thumbnail`, `gallery`
  - `tags`/`categories` (tuỳ chọn)
  - `ratingSummary` (tuỳ chọn)

**Endpoints gợi ý**:
- `GET /api/v1/foods?provinceId=&search=&page=&limit=` (public)
- `GET /api/v1/foods/slug/:slug` (public)
- `GET /api/v1/foods/featured?provinceId=&limit=` (public)
- `POST/PATCH/DELETE /api/v1/foods` (admin)

**Tích hợp liên module (gợi ý)**:
- Tour detail/hotel detail có block “Đặc sản địa phương” dựa trên `provinceId`.
- Nếu muốn “mua đặc sản” → map `FoodItem` ↔ `Product` (1-1 hoặc 1-n).

### 7.2) E-commerce “đồ du lịch” (Travel Goods)

Hiện dự án đã có `product`, `orders`, `payment`. Phase tiếp theo chủ yếu là **mở rộng nghiệp vụ**:

- **Catalogue**: category/brand/attributes (size/color/material), search/filter tốt hơn.
- **Inventory**: tồn kho theo SKU/variant, reservation khi checkout.
- **Fulfillment**: shipping address, shipping fee, trạng thái vận chuyển (packed/shipped/delivered).
- **Promotions**: voucher, combo, flash sale, giới hạn theo thời gian.
- **Payment**: hoàn tiền/partial refund, đối soát, idempotency + webhook hardening.

---

## 8) Tài liệu liên quan

- `docs/FE-API-TOUR.md` — API Tours cho Frontend
- `docs/FE-API-CHANGES.md` — tóm tắt thay đổi API (provinces/hotel/room…)
- `plans/TOUR-MODULE-PLAN.md` — kế hoạch module tour (MVP + phase tương lai)

