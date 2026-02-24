# Tour API – Hướng dẫn cho FE Admin

Tài liệu dành cho **Frontend Admin**: tạo/sửa tour, **upload ảnh gallery** (giống Room và Rating).

**Base URL:** `http://localhost:3000/api/v1`

---

## 🔐 Authentication

Mọi API dưới đây (trừ khi ghi chú) cần **Bearer token**:

```
Authorization: Bearer <access_token>
```

---

## 📤 Upload ảnh Tour (Gallery + Thumbnail)

### Cách hoạt động (giống Room)

- **POST** và **PATCH** tour hỗ trợ `multipart/form-data`.
- Field ảnh: **`gallery`** (nhiều file), tối đa **10 ảnh**.
- **Ảnh đầu tiên** trong danh sách được dùng làm **thumbnail**.
- Thứ tự file gửi lên = thứ tự hiển thị (`order`: 0, 1, 2, ...).
- Khi **PATCH** và gửi ảnh mới: **toàn bộ gallery cũ** bị thay thế (ảnh cũ xóa trên Cloudinary).

### POST `/api/v1/tours` – Tạo tour (có ảnh)

**Content-Type:** `multipart/form-data`

**Form fields:**

| Field | Type | Ghi chú |
|-------|------|--------|
| `gallery` | File[] | Nhiều file, tối đa 10. Ảnh đầu = thumbnail. |
| Các field JSON | string | `slug`, `code`, `duration`, `translations`, `itinerary`, `capacity`, `pricing`, `destinations`, `departureProvinceId`, ... (object/array gửi dạng **string JSON**). |

**Ví dụ form data (pseudo):**

```
gallery: [File, File, File]   // ảnh 1 = thumbnail, 2–3 = gallery
slug: "halong-2-ngay-1-dem"
code: "TOUR-HALONG-001"
isActive: true
tourType: DOMESTIC
duration: {"days":2,"nights":1}
destinations: [{"provinceId":"675xxx","isMainDestination":true}]
departureProvinceId: 675yyy
translations: {"vi":{"name":"Tour Hạ Long 2N1Đ",...},"en":{...}}
capacity: {"minGuests":2,"maxGuests":30,"privateAvailable":true}
pricing: {"basePrice":3500000,"currency":"VND","childPrice":2500000,...}
itinerary: [...]
amenities: ["id1","id2"]
transportTypes: ["BUS","BOAT"]
bookingConfig: {...}
difficulty: EASY
```

**Response:** Tour object (có `thumbnail`, `gallery` với `url`, `publicId`, `order`).

---

### PATCH `/api/v1/tours/:id` – Cập nhật tour (đổi ảnh)

**Content-Type:** `multipart/form-data` (khi gửi ảnh) hoặc `application/json` (chỉ sửa field).

- Khi gửi field **`gallery`** (file): gallery cũ bị xóa, thay bằng ảnh mới; ảnh đầu = thumbnail.
- Có thể vừa gửi ảnh vừa gửi các field khác (partial update).

**Ví dụ chỉ đổi ảnh:**

```
gallery: [File, File]
```

**Ví dụ vừa đổi ảnh vừa đổi giá:**

```
gallery: [File, File]
pricing: {"basePrice":3200000,"currency":"VND"}
```

**Response:** Tour object sau khi cập nhật.

---

## 📋 Ví dụ code (FE Admin)

### 1. Tạo tour có ảnh (multipart/form-data)

```typescript
// Giả sử form có: slug, code, duration, destinations, translations, capacity, pricing, itinerary, gallery (files)

async function createTourWithGallery(formData: FormData) {
  const res = await fetch('/api/v1/tours', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      // KHÔNG set Content-Type; browser sẽ set multipart/form-data + boundary
    },
    body: formData,
  });
  return res.json();
}

// Cách build FormData
const formData = new FormData();
formData.append('slug', 'halong-2-ngay-1-dem');
formData.append('code', 'TOUR-HALONG-001');
formData.append('isActive', 'true');
formData.append('tourType', 'DOMESTIC');
formData.append('duration', JSON.stringify({ days: 2, nights: 1 }));
formData.append('destinations', JSON.stringify([{ provinceId: '675xxx', isMainDestination: true }]));
formData.append('departureProvinceId', '675yyy');
formData.append('translations', JSON.stringify({ vi: { name: '...' }, en: { name: '...' } }));
formData.append('capacity', JSON.stringify({ minGuests: 2, maxGuests: 30, privateAvailable: true }));
formData.append('pricing', JSON.stringify({ basePrice: 3500000, currency: 'VND' }));
formData.append('itinerary', JSON.stringify([...]));
formData.append('difficulty', 'EASY');

// Ảnh: field name phải là "gallery", nhiều file
for (let i = 0; i < files.length; i++) {
  formData.append('gallery', files[i]); // cùng tên "gallery" cho mọi file
}

await createTourWithGallery(formData);
```

### 2. Axios – Tạo tour có ảnh

```typescript
const formData = new FormData();
formData.append('slug', data.slug);
formData.append('code', data.code);
// ... các field khác, object/array dùng JSON.stringify
formData.append('duration', JSON.stringify(data.duration));
formData.append('translations', JSON.stringify(data.translations));
// ...
data.galleryFiles.forEach((file: File) => formData.append('gallery', file));

await axios.post('/api/v1/tours', formData, {
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'multipart/form-data',
  },
});
```

### 3. Cập nhật tour và thay ảnh

```typescript
const formData = new FormData();
formData.append('pricing', JSON.stringify({ basePrice: 3200000, currency: 'VND' }));
newGalleryFiles.forEach((file: File) => formData.append('gallery', file));

await axios.patch(`/api/v1/tours/${tourId}`, formData, {
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'multipart/form-data',
  },
});
```

---

## 📌 Lưu ý cho Admin

1. **Field name ảnh:** Luôn dùng **`gallery`** (giống Room), không dùng `images` hay `files`.
2. **Thumbnail:** Không gửi field riêng; ảnh đầu tiên trong `gallery` = thumbnail.
3. **Số lượng:** Tối đa 10 ảnh mỗi request.
4. **PATCH:** Gửi ảnh mới = thay toàn bộ gallery cũ; không hỗ trợ “thêm 1 ảnh” hay “xóa 1 ảnh” riêng lẻ trong API này.
5. **Object/array trong form:** Gửi dạng string (ví dụ `JSON.stringify(...)`) khi dùng `multipart/form-data`.
6. **Content-Type:** Khi dùng `FormData`, không cần (hoặc để browser tự set) `Content-Type` để có boundary đúng; nếu dùng axios thì `'Content-Type': 'multipart/form-data'` thường đủ.

---

## 📚 API khác dùng cho Admin

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/api/v1/tours` | Danh sách tour (query: page, limit, search, ...) |
| GET | `/api/v1/tours/:id` | Chi tiết tour (sửa form) |
| GET | `/api/v1/tours/options` | Options dropdown (destinationId?) |
| GET | `/api/v1/provinces` | Tỉnh (destinations, departure) |
| POST | `/api/v1/tours` | Tạo tour (body: multipart form-data với `gallery`) |
| PATCH | `/api/v1/tours/:id` | Cập nhật tour (body: multipart hoặc JSON) |
| DELETE | `/api/v1/tours/:id` | Xóa (soft: isActive = false) |

Chi tiết request/response đầy đủ xem **FE-API-TOUR.md** và **FE-API-TOUR-PHASE2.md** (booking).

---

## ⭐ Reviews & Rating (Tour)

Collection **reviews** dùng chung (Room, Hotel, **Tour**, Blog). Với tour dùng `entityType: 'TOUR'`, `entityId`: tour ID.

### GET `/api/v1/reviews/admin` – Danh sách review (Admin)

**Query:** `entityType=TOUR`, `isApproved=true|false`, `page`, `limit`

**Response:**

```json
{
  "data": [ { "_id", "entityType", "entityId", "rating", "comment", "userId": { "username", "email" }, "isApproved", "createdAt" } ],
  "pagination": { "page": 1, "limit": 20, "total": 100 }
}
```

Dùng để duyệt review tour, lọc theo đã duyệt/chưa duyệt.

---

### PATCH `/api/v1/reviews/:id/approve` – Duyệt review

**Body:** Không cần.

**Response:** Review đã cập nhật `isApproved: true`. Backend tự cập nhật **ratingSummary** (average, total) của tour tương ứng.

---

### DELETE `/api/v1/reviews/:id` – Xóa review

**Response:** Thành công. **ratingSummary** của tour được recalculate lại.

---

## 📚 Bảng API cho Admin (tóm tắt)

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/api/v1/tours` | Danh sách tour (query: page, limit, search, ...) |
| GET | `/api/v1/tours/:id` | Chi tiết tour (sửa form) |
| GET | `/api/v1/tours/options` | Options dropdown (destinationId?) |
| GET | `/api/v1/provinces` | Tỉnh (destinations, departure) |
| POST | `/api/v1/tours` | Tạo tour (body: multipart form-data với `gallery`) |
| PATCH | `/api/v1/tours/:id` | Cập nhật tour (body: multipart hoặc JSON) |
| DELETE | `/api/v1/tours/:id` | Xóa (soft: isActive = false) |
| GET | `/api/v1/reviews/admin` | Danh sách review (query: entityType=TOUR, isApproved, page, limit) |
| PATCH | `/api/v1/reviews/:id/approve` | Duyệt review tour |
| DELETE | `/api/v1/reviews/:id` | Xóa review (recalculate ratingSummary tour) |

Chi tiết request/response đầy đủ xem **FE-API-TOUR.md** (phần Reviews & Rating) và **FE-API-TOUR-PHASE2.md** (booking).

---

**Version:** 1.0.0
