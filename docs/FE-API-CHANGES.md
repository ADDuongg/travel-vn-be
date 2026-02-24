# FE API Changes – Backend Updates

Dành cho **FE Client** & **FE Admin**. Phiên bản gọn, đủ thông tin.

---

## Tổng quan APIs

| Module    | Endpoint                                  | Mô tả                  |
| --------- | ----------------------------------------- | ---------------------- |
| Provinces | `GET /api/v1/provinces`                   | List tỉnh (dropdown)   |
| Hotels    | `GET /api/v1/hotels`                      | List hotels            |
| Hotels    | `GET /api/v1/hotels?provinceId=`          | List hotels theo tỉnh  |
| Hotels    | `GET /api/v1/hotels/options?provinceId=`  | Options dropdown       |
| Hotels    | `GET /api/v1/hotels/:id`                  | Chi tiết hotel         |
| Hotels    | `POST /api/v1/hotels`                     | Tạo hotel              |
| Hotels    | `PATCH /api/v1/hotels/:id`                | Cập nhật hotel         |
| Rooms     | `GET /api/v1/rooms?provinceId=&hotelIds=` | List rooms (có filter) |
| Rooms     | `GET /api/v1/rooms/:id`                   | Chi tiết room          |

**Quan hệ:** Province → Hotel (provinceId) → Room (hotelId)

---

## 1. PROVINCES

- **GET** `/api/v1/provinces` → `Province[]`
- Dùng: Dropdown tỉnh (Admin form Hotel, Client filter phòng)

```typescript
interface Province {
  _id: string;
  code: string;
  slug: string;
  name: { vi: string; en: string };
  fullName?: { vi: string; en: string };
}
```

---

## 2. HOTEL (Module mới / thiết kế lại)

### 2.1. APIs & Response

| Method | Endpoint                 | Query         | Response        |
| ------ | ------------------------ | ------------- | --------------- |
| GET    | `/api/v1/hotels`         | `provinceId?` | `HotelOption[]` |
| GET    | `/api/v1/hotels/options` | `provinceId?` | `HotelOption[]` |
| GET    | `/api/v1/hotels/:id`     | -             | `Hotel` (full)  |
| POST   | `/api/v1/hotels`         | -             | `Hotel`         |
| PATCH  | `/api/v1/hotels/:id`     | -             | `Hotel`         |

**HotelOption** (list/options): `_id`, `slug`, `translations`, `provinceId` (populate: name, code, slug)

**Hotel** (detail): full + `contact`, `location`, `thumbnail`, `gallery`, `amenities` (populate)

### 2.2. Breaking changes (nếu có data cũ)

### 2.3. POST/PATCH Body (Admin)

**Required:** `slug`, `provinceId`, `translations`

```json
{
  "slug": "hotel-abc",
  "isActive": true,
  "starRating": 3,
  "provinceId": "<_id từ GET /provinces>",
  "translations": {
    "vi": {
      "name": "Khách sạn ABC",
      "description": "...",
      "shortDescription": "...",
      "address": "...",
      "policies": ["Không hút thuốc"],
      "seo": { "title": "...", "description": "..." }
    },
    "en": { "name": "...", ... }
  },
  "contact": { "phone": "...", "email": "...", "website": "..." },
  "location": { "lat": 21.0, "lng": 105.8 },
  "amenities": ["<amenityId1>", "<amenityId2>"]
}
```

- **Form-data:** `translations`, `contact`, `location`, `amenities` gửi JSON string
- **starRating:** 1–5, mặc định 3
- **provinceId:** phải tồn tại trong collection provinces
- **PATCH:** tất cả field optional (PartialType)

### 2.4. Types (Hotel module)

```typescript
interface HotelTranslation {
  name: string;
  description?: string;
  shortDescription?: string;
  address?: string;
  policies?: string[];
  seo?: { title?: string; description?: string };
}

interface HotelContact {
  phone?: string;
  email?: string;
  website?: string;
}

interface HotelLocation {
  lat?: number;
  lng?: number;
}

interface ProvinceRef {
  _id: string;
  name: { vi: string; en: string };
  code: string;
  slug: string;
  fullName?: { vi: string; en: string };
}

interface Hotel {
  _id: string;
  slug: string;
  isActive: boolean;
  starRating: number;
  provinceId: string | ProvinceRef;
  translations: Record<string, HotelTranslation>;
  contact?: HotelContact;
  location?: HotelLocation;
  thumbnail?: { url: string; publicId?: string; alt?: string };
  gallery?: Array<{
    url: string;
    publicId?: string;
    alt?: string;
    order?: number;
  }>;
  amenities?: Array<{ _id: string; [key: string]: unknown }>;
}
```

### 2.5. FE Admin – Hotel CRUD

1. **List:** `GET /hotels` hoặc `GET /hotels?provinceId=xxx`
2. **Tạo:** Form `provinceId` (từ GET /provinces), `translations` (vi, en), `slug`, `contact`, `location`, `amenities`
3. **Sửa:** `PATCH /hotels/:id` với body tương tự (partial)
4. **Dropdown (tạo Room):** `GET /hotels/options` hoặc `GET /hotels/options?provinceId=xxx`

### 2.6. FE Client – Hotel

- Hiển thị hotel: dùng `hotel.translations[lang].name`, `hotel.provinceId.name[lang]`
- List/dropdown: dùng response từ `GET /hotels` hoặc `GET /hotels/options`

---

## 3. ROOM (Cập nhật)

### 3.1. Thay đổi

- `hotelId` trong response: **object đã populate** (hotel + province), không còn chỉ là ID
- Thêm query: **`provinceId`** – lọc room theo tỉnh (qua hotel)

### 3.2. Query params (GET /rooms)

| Param                                        | Mô tả              |
| -------------------------------------------- | ------------------ |
| `provinceId`                                 | Lọc theo tỉnh      |
| `hotelIds`                                   | Lọc theo hotel IDs |
| `page`, `limit`, `sortBy`                    | Phân trang, sort   |
| `minPrice`, `maxPrice`, `adults`, `children` | Filter             |
| `keyword`, `lang`                            | Search             |
| `checkIn`, `checkOut`                        | Availability       |
| `minRating`, `amenities`, `roomSize`         | Filter             |

### 3.3. Response

- **List:** mỗi room có `hotelId: { _id, slug, translations, provinceId: { _id, name, code, slug } }`
- **Detail:** `hotelId` có thêm `contact`, `location`, `provinceId.fullName`

### 3.4. FE cần cập nhật

- Client: Hiển thị `room.hotelId.translations[lang].name`, `room.hotelId.provinceId.name[lang]`
- Client: Filter tỉnh dùng `?provinceId=xxx`
- Client: Thêm màn hiển thị list hotel với dropdown provinces + ward theo schema provinces
- Admin: Dropdown hotel từ `GET /hotels/options`

---

## 4. Luồng gợi ý

**Admin:** Provinces → Hotels (provinceId) → Rooms (hotelId)

**Client:** Filter province → GET rooms?provinceId= → Hiển thị room + hotel + province

**Ngôn ngữ:** Dùng `translations[lang]` (vi/en) theo locale FE.

---

## 5. Booking & Tour Booking – userId từ JWT (Breaking change)

**Áp dụng từ:** 2025-02-23

### 5.1. Thay đổi

- **Room Booking** (`POST /api/v1/bookings/room`) và **Tour Booking** (`POST /api/v1/tour-bookings`) **bắt buộc đăng nhập** (gửi Bearer token).
- **userId không còn nhận từ payload:** Backend lấy `userId` từ JWT (`req.user.userId`), FE **không được** gửi `userId` trong body.

### 5.2. Cập nhật FE

| Endpoint | Trước | Sau |
|----------|--------|-----|
| `POST /api/v1/bookings/room` | Có thể gửi `userId` trong body (optional) | **Header:** `Authorization: Bearer <token>` bắt buộc. **Body:** không gửi `userId`. |
| `POST /api/v1/tour-bookings` | Có thể gửi `userId` trong body (optional) | **Header:** `Authorization: Bearer <token>` bắt buộc. **Body:** không gửi `userId`. |

### 5.3. Body sau khi sửa

**POST /api/v1/bookings/room** – không có field `userId`:

```json
{
  "roomId": "...",
  "checkIn": "2025-03-01",
  "checkOut": "2025-03-03",
  "rooms": [{ "adults": 2, "children": 0 }]
}
```

**POST /api/v1/tour-bookings** – không có field `userId`:

```json
{
  "tourId": "...",
  "departureDate": "2025-03-08",
  "guest": { "fullName": "...", "email": "...", "phone": "..." },
  "adults": 2,
  "children": 0,
  "infants": 0
}
```

### 5.4. Lưu ý

- User phải **đăng nhập** trước khi gọi tạo đặt phòng hoặc đặt tour.
- Nếu không gửi token hoặc token hết hạn → 401 Unauthorized.

---

## 6. Cancel booking – User & Admin (thống nhất Room + Tour)

**Áp dụng từ:** 2025-02-23

### 6.1. Quy tắc hủy đơn

- **Room:** `PATCH /api/v1/bookings/:id/cancel` – cần **Bearer token**. Chỉ **chủ đơn** (user đã đặt) hoặc **admin** mới hủy được.
- **Tour:** `PATCH /api/v1/tour-bookings/:id/cancel` – cần **Bearer token**. Chỉ **chủ đơn** hoặc **admin** mới hủy được.

### 6.2. Cập nhật FE

- **FE Client:** Có thể gọi cancel cho **đơn của chính user** (truyền id đơn từ "Đơn của tôi"). Gửi kèm Bearer token. Nếu không phải chủ đơn → 403 Forbidden.
- **FE Admin:** Gọi cancel với token admin → hủy được mọi đơn (room hoặc tour).

---

_v1.1 | nestjs-tours backend | 2025-02-23_
