## FE API - PROVINCE (CLIENT)

Tài liệu mô tả các **API public** cho module Tỉnh/Thành phố, dùng trên FE Client: hiển thị danh sách, tỉnh nổi bật, chi tiết tỉnh, dropdown cho form.

---

### 1. Danh sách tỉnh/thành (có filter, pagination)

- **Method**: GET  
- **URL**: `/api/v1/provinces`  
- **Auth**: Public  

- **Query params**:
  - `page?: number` — Mặc định: `1`.
  - `limit?: number` — Mặc định: `34` (tổng số tỉnh).
  - `region?: 'NORTH' | 'CENTRAL' | 'SOUTH'` — Lọc theo miền.
  - `isPopular?: boolean` — Lọc tỉnh nổi bật.
  - `isActive?: boolean` — Lọc trạng thái (client thường không cần gửi, mặc định BE trả tất cả).
  - `search?: string` — Tìm theo tên (vi hoặc en), case-insensitive.
  - `sort?: 'name' | 'displayOrder' | 'newest'` — Mặc định: `name`.

- **Response**:

```json
{
  "items": [
    {
      "_id": "provinceId",
      "type": "province",
      "code": "01",
      "slug": "ha-noi",
      "name": { "vi": "Hà Nội", "en": "Ha Noi" },
      "fullName": { "vi": "Thành phố Hà Nội", "en": "Ha Noi City" },
      "thumbnail": {
        "url": "https://res.cloudinary.com/...",
        "publicId": "provinces/thumbnail/...",
        "alt": "Hà Nội"
      },
      "gallery": [],
      "translations": {
        "vi": {
          "description": "Thủ đô ngàn năm văn hiến...",
          "shortDescription": "Hà Nội - trái tim Việt Nam"
        },
        "en": {
          "description": "Capital of thousand years...",
          "shortDescription": "Hanoi - heart of Vietnam"
        }
      },
      "isPopular": true,
      "displayOrder": 1,
      "isActive": true,
      "region": "NORTH",
      "createdAt": "2026-02-01T00:00:00.000Z",
      "updatedAt": "2026-02-25T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 34,
    "total": 34,
    "totalPages": 1
  }
}
```

> **Lưu ý**: Response **KHÔNG** trả `wards` để giảm payload. Dùng endpoint chi tiết (`:slug`) nếu cần wards.

---

### 2. Tỉnh nổi bật

- **Method**: GET  
- **URL**: `/api/v1/provinces/popular`  
- **Auth**: Public  

- **Response**: mảng `ProvinceListItem[]` (không kèm wards), chỉ các tỉnh `isActive: true` và `isPopular: true`, sắp xếp theo `displayOrder`.

```json
[
  {
    "_id": "provinceId",
    "code": "01",
    "slug": "ha-noi",
    "name": { "vi": "Hà Nội", "en": "Ha Noi" },
    "fullName": { "vi": "Thành phố Hà Nội", "en": "Ha Noi City" },
    "thumbnail": { "url": "...", "publicId": "...", "alt": "..." },
    "gallery": [],
    "translations": { "vi": { "shortDescription": "..." } },
    "isPopular": true,
    "displayOrder": 1,
    "isActive": true,
    "region": "NORTH"
  }
]
```

> FE dùng endpoint này cho section "Điểm đến nổi bật" trên trang chủ.

---

### 3. Chi tiết tỉnh/thành (kèm wards)

- **Method**: GET  
- **URL**: `/api/v1/provinces/:slug`  
- **Auth**: Public  

- **Response**: object `ProvinceDetail` đầy đủ, **kèm `wards`**.

```json
{
  "_id": "provinceId",
  "type": "province",
  "code": "01",
  "slug": "ha-noi",
  "name": { "vi": "Hà Nội", "en": "Ha Noi" },
  "fullName": { "vi": "Thành phố Hà Nội", "en": "Ha Noi City" },
  "thumbnail": { "url": "...", "publicId": "...", "alt": "..." },
  "gallery": [
    { "url": "...", "publicId": "...", "alt": "...", "order": 1 }
  ],
  "translations": {
    "vi": {
      "description": "Thủ đô ngàn năm văn hiến...",
      "shortDescription": "Hà Nội - trái tim Việt Nam",
      "seo": {
        "title": "Du lịch Hà Nội",
        "description": "Khám phá Hà Nội...",
        "keywords": ["hà nội", "du lịch"]
      }
    }
  },
  "isPopular": true,
  "displayOrder": 1,
  "isActive": true,
  "region": "NORTH",
  "wards": [
    {
      "type": "ward",
      "code": "00004",
      "slug": "ba-dinh",
      "name": { "vi": "Ba Đình", "en": "Ba Dinh" }
    }
  ],
  "createdAt": "2026-02-01T00:00:00.000Z",
  "updatedAt": "2026-02-25T10:00:00.000Z"
}
```

> FE dùng cho trang chi tiết tỉnh/thành, hiển thị mô tả, gallery, danh sách quận/huyện.

---

### 4. Dropdown cho form (chọn tỉnh/thành)

- **Method**: GET  
- **URL**: `/api/v1/provinces/dropdown`  
- **Auth**: Public  

- **Response**: mảng nhẹ `ProvinceDropdownItem[]`, kèm wards (cho cascading dropdown Tỉnh → Quận/Huyện).

```json
[
  {
    "_id": "provinceId",
    "code": "01",
    "slug": "ha-noi",
    "name": { "vi": "Hà Nội", "en": "Ha Noi" },
    "fullName": { "vi": "Thành phố Hà Nội", "en": "Ha Noi City" },
    "wards": [
      {
        "type": "ward",
        "code": "00004",
        "slug": "ba-dinh",
        "name": { "vi": "Ba Đình", "en": "Ba Dinh" }
      }
    ]
  }
]
```

> Endpoint này **không** trả thumbnail, gallery, translations, flags. Chỉ dùng cho form select/dropdown.

---

### TypeScript Types (copy sang FE)

```typescript
interface LocalizedName {
  vi: string;
  en: string;
}

interface Ward {
  type: string;
  code: string;
  slug: string;
  name: LocalizedName;
}

interface ImageItem {
  url: string;
  publicId?: string;
  alt?: string;
  order?: number;
}

interface ProvinceSeo {
  title?: string;
  description?: string;
  keywords?: string[];
}

interface ProvinceTranslation {
  description?: string;
  shortDescription?: string;
  seo?: ProvinceSeo;
}

interface ProvinceListItem {
  _id: string;
  type: string;
  code: string;
  slug: string;
  name: LocalizedName;
  fullName?: LocalizedName;
  thumbnail?: ImageItem;
  gallery: ImageItem[];
  translations: Record<string, ProvinceTranslation>;
  isPopular: boolean;
  displayOrder: number;
  isActive: boolean;
  region?: 'NORTH' | 'CENTRAL' | 'SOUTH';
  createdAt: string;
  updatedAt: string;
}

interface ProvinceDetail extends ProvinceListItem {
  wards: Ward[];
}

interface ProvinceDropdownItem {
  _id: string;
  code: string;
  slug: string;
  name: LocalizedName;
  fullName?: LocalizedName;
  wards?: Ward[];
}
```

---

**Version:** 1.0.0  
**Cập nhật:** 2026-02-26 — Khởi tạo FE API Province Client.
