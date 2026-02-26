## FE API - PROVINCE (ADMIN)

Tài liệu mô tả các **API Admin** cho module Tỉnh/Thành phố: cập nhật metadata (thumbnail, gallery, mô tả, SEO...), toggle nổi bật, soft delete / restore.

> **Lưu ý**: Admin **KHÔNG** thể sửa các trường dữ liệu chuẩn địa lý (`code`, `slug`, `name`, `fullName`, `wards`). Chỉ quản lý metadata du lịch.

---

### 1. Danh sách tỉnh/thành (cho admin table)

- **Method**: GET  
- **URL**: `/api/v1/provinces`  
- **Auth**: Public (admin dùng chung endpoint với client)

- **Query params** (thêm cho admin):
  - `isActive?: boolean` — `false` để xem các tỉnh đã bị ẩn.
  - Các filter khác: `page`, `limit`, `region`, `isPopular`, `search`, `sort`.

> Response **KHÔNG** kèm `wards`. Admin xem wards ở trang detail.

---

### 2. Chi tiết tỉnh/thành (admin detail)

- **Method**: GET  
- **URL**: `/api/v1/provinces/:slug`  
- **Auth**: Public

> Response kèm **đầy đủ wards**. FE admin có thể hiển thị wards dạng **collapsible/accordion** hoặc **searchable table** (read-only, không cho sửa wards).

---

### 3. Cập nhật metadata tỉnh/thành

- **Method**: PATCH  
- **URL**: `/api/v1/provinces/:id`  
- **Auth**: **JWT + Admin**  
- **Body**: `multipart/form-data` (nếu upload thumbnail/gallery) hoặc `application/json`.

- **Fields** (tất cả optional, chỉ gửi field cần update):

| Field | Type | Mô tả |
|---|---|---|
| `translations` | `object` | Object theo langCode: `{ vi: { description, shortDescription, seo: { title, description, keywords } }, en: { ... } }` |
| `isPopular` | `boolean` | Đánh dấu tỉnh nổi bật |
| `displayOrder` | `number` | Thứ tự hiển thị (>= 0) |
| `isActive` | `boolean` | Ẩn/hiện tỉnh |
| `region` | `string` | Enum: `NORTH`, `CENTRAL`, `SOUTH` |
| `gallery` | `array` | JSON array `[{ url, publicId?, alt?, order? }]` — danh sách ảnh hiện tại (gửi lại để reorder/xóa ảnh cũ) |
| `thumbnail` | `File` | File upload ảnh đại diện (field name: `thumbnail`) |
| `gallery` (files) | `File[]` | File upload ảnh mới (field name: `gallery`, tối đa 10 file) |

- **Ví dụ body** (JSON, không upload file):

```json
{
  "translations": {
    "vi": {
      "description": "Thủ đô ngàn năm văn hiến...",
      "shortDescription": "Hà Nội - trái tim Việt Nam",
      "seo": {
        "title": "Du lịch Hà Nội 2026",
        "description": "Khám phá vẻ đẹp Hà Nội...",
        "keywords": ["hà nội", "du lịch", "thủ đô"]
      }
    },
    "en": {
      "description": "Capital of thousand years of civilization...",
      "shortDescription": "Hanoi - heart of Vietnam"
    }
  },
  "isPopular": true,
  "displayOrder": 1,
  "region": "NORTH"
}
```

- **Response**: object `ProvinceDetail` sau khi cập nhật.

```json
{
  "_id": "provinceId",
  "type": "province",
  "code": "01",
  "slug": "ha-noi",
  "name": { "vi": "Hà Nội", "en": "Ha Noi" },
  "thumbnail": { "url": "...", "publicId": "...", "alt": "..." },
  "translations": { "vi": { "description": "..." } },
  "isPopular": true,
  "displayOrder": 1,
  "isActive": true,
  "region": "NORTH"
}
```

> **Upload ảnh**: Dùng `FormData`, field name `thumbnail` cho ảnh đại diện, `gallery` cho mảng ảnh. Ảnh cũ trên Cloudinary tự động bị xóa khi thay thế.

---

### 4. Toggle nổi bật

- **Method**: PATCH  
- **URL**: `/api/v1/provinces/:id/toggle-popular`  
- **Auth**: **JWT + Admin**  
- **Body**: không cần

- **Response**: object Province sau khi toggle.

```json
{
  "_id": "provinceId",
  "isPopular": true,
  "..."
}
```

---

### 5. Soft Delete (ẩn tỉnh)

- **Method**: DELETE  
- **URL**: `/api/v1/provinces/:id`  
- **Auth**: **JWT + Admin**  
- **Body**: không cần

- **Response**:

```json
{
  "message": "Province deactivated successfully"
}
```

> Soft delete chỉ set `isActive = false`. Không xóa dữ liệu. Tỉnh vẫn còn trong DB, có thể restore.

---

### 6. Restore (khôi phục tỉnh đã ẩn)

- **Method**: PATCH  
- **URL**: `/api/v1/provinces/:id/restore`  
- **Auth**: **JWT + Admin**  
- **Body**: không cần

- **Response**:

```json
{
  "message": "Province restored successfully"
}
```

---

### Admin UI gợi ý

#### Trang danh sách
- Table: Tên (vi) | Code | Miền | Nổi bật | Trạng thái | Thứ tự | Actions
- Filter: miền (NORTH/CENTRAL/SOUTH), nổi bật, trạng thái, search tên
- Actions: Edit, Toggle Popular, Delete/Restore

#### Trang chi tiết / edit
- Form edit: Translations (vi/en tabs), SEO fields, thumbnail upload, gallery upload, region select, isPopular toggle, displayOrder input
- Section wards: hiển thị read-only dạng **collapsible accordion** hoặc **searchable table** (không cho sửa)
- Số lượng wards có thể lớn (50-100+), nên dùng **virtual scroll** hoặc **pagination** trong UI

---

**Version:** 1.0.0  
**Cập nhật:** 2026-02-26 — Khởi tạo FE API Province Admin.
