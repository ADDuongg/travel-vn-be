# Tour API – Hướng dẫn cho FE Client

Tài liệu dành cho **Frontend Client (user)**: xem danh sách tour, chi tiết tour, **thumbnail & gallery** (chỉ đọc, không upload).

**Base URL:** `http://localhost:3000/api/v1`

---

## 🔓 Public API (không cần đăng nhập)

Các endpoint dưới đây **không** cần Bearer token.

---

## 📖 Danh sách tour

### GET `/api/v1/tours`

**Query:**

| Parameter | Type | Mô tả |
|-----------|------|--------|
| page | number | Trang (default: 1) |
| limit | number | Số item/trang (default: 12, max: 50) |
| destinationId | string | Lọc theo điểm đến (provinceId) |
| departureProvinceId | string | Lọc theo điểm khởi hành |
| tourType | string | DOMESTIC \| INTERNATIONAL \| DAILY |
| minDays, maxDays | number | Lọc theo số ngày |
| minPrice, maxPrice | number | Lọc theo giá (VND) |
| difficulty | string | EASY \| MODERATE \| CHALLENGING \| DIFFICULT |
| sortBy | string | price_asc, price_desc, duration_asc, duration_desc, rating, newest |
| search | string | Tìm theo tên/code |
| transportTypes | string | Comma-separated (vd: BUS,BOAT) |

**Response:**

```json
{
  "items": [
    {
      "_id": "675abc123",
      "slug": "sapa-3-ngay-2-dem",
      "code": "TOUR-SAPA-001",
      "tourType": "DOMESTIC",
      "duration": { "days": 3, "nights": 2 },
      "destinations": [{ "provinceId": { "_id": "...", "name": {...}, "slug": "lao-cai" }, "isMainDestination": true }],
      "departureProvinceId": { "_id": "...", "name": {...} },
      "translations": {
        "vi": { "name": "Tour Sapa 3N2Đ", "shortDescription": "..." },
        "en": { "name": "Sapa 3D2N Tour", "shortDescription": "..." }
      },
      "pricing": { "basePrice": 2990000, "currency": "VND", "childPrice": 1990000 },
      "thumbnail": {
        "url": "https://res.cloudinary.com/...",
        "publicId": "tours/xxx",
        "alt": null
      },
      "gallery": [
        { "url": "https://...", "publicId": "...", "order": 0 },
        { "url": "https://...", "publicId": "...", "order": 1 }
      ],
      "ratingSummary": { "average": 4.7, "total": 156 },
      "difficulty": "MODERATE",
      "isActive": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 45,
    "totalPages": 4
  }
}
```

**Hiển thị trên Client:**

- **Thumbnail:** `item.thumbnail?.url` (fallback: ảnh mặc định hoặc `item.gallery?.[0]?.url`).
- **Tên tour:** `item.translations[lang]?.name` (vd: `vi`, `en`).
- **Giá:** `item.pricing.basePrice`, format VND.
- **Rating:** `item.ratingSummary.average`, `item.ratingSummary.total`.

---

## 📖 Chi tiết tour (trang tour detail)

### GET `/api/v1/tours/:id`  
### GET `/api/v1/tours/slug/:slug`

**Response:** Một tour đầy đủ (destinations, itinerary, pricing, **thumbnail**, **gallery**, amenities, bookingConfig, ...).

**Cấu trúc thumbnail & gallery (chỉ đọc):**

```typescript
// Thumbnail (ảnh đại diện)
thumbnail?: {
  url: string;      // URL ảnh (Cloudinary)
  publicId?: string;
  alt?: string;
}

// Gallery (ảnh xem thêm, đã sắp order)
gallery: Array<{
  url: string;
  publicId?: string;
  alt?: string;
  order?: number;   // 0, 1, 2, ...
}>;
```

**Gợi ý hiển thị:**

1. **Banner/hero:** Dùng `thumbnail.url` hoặc `gallery[0].url`.
2. **Gallery/lightbox:** Duyệt `gallery` theo `order` (hoặc sort `gallery` theo `order`), hiển thị `url`.
3. **Fallback:** Nếu không có `thumbnail`, dùng `gallery[0]?.url`.

**Ví dụ React (gallery):**

```tsx
const sortedGallery = (tour.gallery || []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

return (
  <div className="tour-gallery">
    <img src={tour.thumbnail?.url || sortedGallery[0]?.url} alt={tour.thumbnail?.alt || tour.translations?.vi?.name} />
    <div className="gallery-grid">
      {sortedGallery.map((img) => (
        <img key={img.publicId || img.url} src={img.url} alt={img.alt || ''} />
      ))}
    </div>
  </div>
);
```

---

## 📖 Tours nổi bật & Options

### GET `/api/v1/tours/featured`

**Query:** `limit` (number, default: 6)

**Response:** Mảng tour (cùng cấu trúc có `thumbnail`, `gallery`). Dùng cho block “Tour nổi bật” trên homepage.

---

### GET `/api/v1/tours/options`

**Query:** `destinationId` (optional)

**Response:** Mảng option `{ _id, slug, code, translations, duration, pricing }`. Dùng cho dropdown chọn tour (không cần hiển thị gallery).

---

## 📅 Availability (đặt tour)

### GET `/api/v1/tours/:id/availability`

**Query:** `month` (string, format `YYYY-MM`, default: tháng hiện tại)

**Response:** Mảng `{ departureDate, availableSlots, totalSlots, status, specialPrice, currency }`.  
Dùng cho calendar chọn ngày khởi hành khi đặt tour.

Chi tiết đặt tour, tra cứu đơn: xem **FE-API-TOUR-PHASE2.md**.

---

## ⭐ Reviews & Rating (Tour)

Collection **reviews** dùng chung cho Room, Hotel, **Tour**, Blog. Trên trang chi tiết tour có thể hiển thị danh sách đánh giá và cho user đăng nhập gửi/cập nhật đánh giá.

### GET `/api/v1/reviews` – Danh sách review công khai (theo tour)

**Query:** `entityType=TOUR`, `entityId=<tourId>`, `page`, `limit`

**Ví dụ:** `GET /api/v1/reviews?entityType=TOUR&entityId=675abc123&page=1&limit=10`

**Response:** Mảng review (chỉ đã duyệt), mỗi item có `_id`, `rating`, `comment`, `isAnonymous`, `createdAt` (userId không trả về nếu isAnonymous).

Dùng để hiển thị block “Đánh giá” dưới trang chi tiết tour.

---

### GET `/api/v1/reviews/me` – Review của tôi cho tour này (Bearer)

**Headers:** `Authorization: Bearer {token}`

**Query:** `entityType=TOUR`, `entityId=<tourId>`

**Response:** Một review object hoặc `null` (user chưa đánh giá tour này).

Dùng để hiển thị form “Sửa đánh giá của tôi” hoặc “Viết đánh giá” (nếu null).

---

### POST `/api/v1/reviews` – Gửi / cập nhật đánh giá tour (Bearer)

**Headers:** `Authorization: Bearer {token}`

**Body:**

```json
{
  "entityType": "TOUR",
  "entityId": "675abc123",
  "rating": 5,
  "comment": "Tour rất hay!",
  "isAnonymous": false
}
```

- Mỗi user chỉ có **một review** cho một tour: gửi lại = cập nhật (upsert).
- Cần ít nhất **rating** hoặc **comment** (1–5 sao).

**Response:** Review document đã lưu. Tour `ratingSummary` (average, total) được cập nhật tự động.

---

## 📌 Tóm tắt cho FE Client

| Nội dung | Cách dùng |
|----------|-----------|
| Danh sách tour | GET `/api/v1/tours` + query. Hiển thị `thumbnail.url`, `translations`, `pricing`, `ratingSummary`. |
| Chi tiết tour | GET `/api/v1/tours/:id` hoặc GET `/api/v1/tours/slug/:slug`. Hiển thị `thumbnail`, `gallery` (sort theo `order`). |
| Tour nổi bật | GET `/api/v1/tours/featured?limit=6`. |
| Options dropdown | GET `/api/v1/tours/options?destinationId=`. |
| Availability | GET `/api/v1/tours/:id/availability?month=YYYY-MM`. |
| **Review tour** | GET `/api/v1/reviews?entityType=TOUR&entityId=<id>` – danh sách đánh giá; GET `reviews/me?entityType=TOUR&entityId=<id>` – review của tôi (Bearer); POST `/api/v1/reviews` – gửi/cập nhật đánh giá (Bearer). |
| Upload ảnh | **Không có** trên Client; chỉ Admin dùng (xem **FE-API-TOUR-ADMIN.md**). |

---

**Version:** 1.0.0
