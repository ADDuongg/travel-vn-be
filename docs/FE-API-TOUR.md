# Tour API - Frontend Documentation

## Base URL
```
http://localhost:3000/api/v1/tours
```

---

## 📋 Tổng quan

Module quản lý tour du lịch với các tính năng:
- ✅ Tìm kiếm và lọc tours (theo giá, số ngày, loại tour, độ khó, ...)
- ✅ Phân trang và sắp xếp
- ✅ Đa ngôn ngữ (vi, en)
- ✅ Lịch trình chi tiết từng ngày
- ✅ Giá tour (người lớn, trẻ em, em bé)
- ✅ Đánh giá và rating
- ✅ Gallery ảnh

---

## 🔐 Authentication

**Public endpoints** (không cần token):
- GET `/api/v1/tours` - Danh sách tours
- GET `/api/v1/tours/:id` - Chi tiết tour
- GET `/api/v1/tours/slug/:slug` - Tour theo slug
- GET `/api/v1/tours/options` - Options cho dropdown
- GET `/api/v1/tours/featured` - Tours nổi bật
- GET `/api/v1/reviews` - Danh sách review công khai (query: entityType, entityId)

**Protected endpoints** (cần Bearer token):
- POST `/api/v1/tours` - Tạo tour (Admin)
- PATCH `/api/v1/tours/:id` - Cập nhật tour (Admin)
- DELETE `/api/v1/tours/:id` - Xóa tour (Admin)
- GET `/api/v1/reviews/me` - Review của tôi (entityType, entityId)
- POST `/api/v1/reviews` - Gửi/cập nhật đánh giá (user hoặc Admin)
- PATCH `/api/v1/reviews/:id/approve` - Duyệt review (Admin)
- DELETE `/api/v1/reviews/:id` - Xóa review (Admin)

---

## 📚 API Endpoints

### 1. GET `/api/v1/tours` - Danh sách tours (Public)

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Số trang |
| limit | number | 12 | Số items/trang (max: 50) |
| destinationId | string | - | Lọc theo điểm đến |
| departureProvinceId | string | - | Lọc theo điểm khởi hành |
| tourType | string | - | `DOMESTIC` \| `INTERNATIONAL` \| `DAILY` |
| minDays | number | - | Số ngày tối thiểu |
| maxDays | number | - | Số ngày tối đa |
| minPrice | number | - | Giá tối thiểu (VND) |
| maxPrice | number | - | Giá tối đa (VND) |
| difficulty | string | - | `EASY` \| `MODERATE` \| `CHALLENGING` \| `DIFFICULT` |
| sortBy | string | newest | `price_asc` \| `price_desc` \| `duration_asc` \| `duration_desc` \| `rating` \| `newest` |
| search | string | - | Tìm kiếm theo tên/code |
| transportTypes | string | - | Lọc theo phương tiện (comma-separated) |

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
      "destinations": [{
        "provinceId": {
          "_id": "675xxx",
          "name": { "vi": "Lào Cai", "en": "Lao Cai" },
          "code": "25",
          "slug": "lao-cai"
        },
        "isMainDestination": true
      }],
      "departureProvinceId": {
        "_id": "675yyy",
        "name": { "vi": "Hà Nội", "en": "Hanoi" },
        "code": "01",
        "slug": "ha-noi"
      },
      "translations": {
        "vi": {
          "name": "Tour Sapa 3 ngày 2 đêm - Khám phá vùng cao Tây Bắc",
          "shortDescription": "Chinh phục Fansipan, tham quan bản làng người H'Mông",
          "highlights": ["Chinh phục đỉnh Fansipan", "Tham quan bản Cát Cát"]
        }
      },
      "capacity": { "minGuests": 2, "maxGuests": 40, "privateAvailable": true },
      "pricing": {
        "basePrice": 2990000,
        "currency": "VND",
        "childPrice": 1990000,
        "singleSupplement": 500000
      },
      "difficulty": "MODERATE",
      "transportTypes": ["BUS"],
      "thumbnail": {
        "url": "https://res.cloudinary.com/...",
        "alt": "Tour Sapa 3 ngày 2 đêm"
      },
      "ratingSummary": { "average": 4.7, "total": 156 },
      "bookingConfig": {
        "advanceBookingDays": 2,
        "allowInstantBooking": true,
        "requireDeposit": true,
        "depositPercent": 30
      },
      "isActive": true,
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z"
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

---

### 2. GET `/api/v1/tours/:id` - Chi tiết tour (Public)

**Params:** `id` (Tour ID)

**Response:**
```json
{
  "_id": "675abc123",
  "slug": "sapa-3-ngay-2-dem",
  "code": "TOUR-SAPA-001",
  "tourType": "DOMESTIC",
  "duration": { "days": 3, "nights": 2 },
  "destinations": [...],
  "departureProvinceId": {...},
  "translations": {
    "vi": {
      "name": "Tour Sapa 3 ngày 2 đêm",
      "description": "Mô tả đầy đủ...",
      "shortDescription": "Mô tả ngắn...",
      "highlights": ["Highlight 1", "Highlight 2"],
      "inclusions": ["Bao gồm 1", "Bao gồm 2"],
      "exclusions": ["Không bao gồm 1"],
      "notes": ["Lưu ý 1", "Lưu ý 2"],
      "cancellationPolicy": "Chính sách hủy...",
      "seo": {
        "title": "SEO title",
        "description": "SEO description",
        "keywords": ["keyword1", "keyword2"]
      }
    }
  },
  "itinerary": [
    {
      "dayNumber": 1,
      "translations": {
        "vi": {
          "title": "Hà Nội - Sapa",
          "description": "Lịch trình ngày 1...",
          "meals": ["Trưa", "Tối"],
          "accommodation": "Khách sạn 3 sao"
        }
      }
    }
  ],
  "capacity": { "minGuests": 2, "maxGuests": 40, "privateAvailable": true },
  "pricing": {
    "basePrice": 2990000,
    "currency": "VND",
    "childPrice": 1990000,
    "infantPrice": 500000,
    "singleSupplement": 500000
  },
  "contact": {
    "phone": "0987654321",
    "email": "tours@example.com",
    "hotline": "1900xxxx"
  },
  "thumbnail": {
    "url": "https://...",
    "publicId": "tours/sapa-001",
    "alt": "Tour Sapa"
  },
  "gallery": [
    {
      "url": "https://...",
      "publicId": "tours/sapa-001-1",
      "alt": "Fansipan",
      "order": 1
    }
  ],
  "amenities": [
    {
      "_id": "675amenity1",
      "name": { "vi": "Wifi miễn phí", "en": "Free Wifi" },
      "icon": "wifi"
    }
  ],
  "transportTypes": ["BUS"],
  "bookingConfig": {
    "advanceBookingDays": 2,
    "allowInstantBooking": true,
    "requireDeposit": true,
    "depositPercent": 30
  },
  "sale": {
    "isActive": true,
    "type": "PERCENT",
    "value": 10,
    "startDate": "2025-02-01T00:00:00.000Z",
    "endDate": "2025-02-28T23:59:59.000Z"
  },
  "ratingSummary": { "average": 4.7, "total": 156 },
  "schedule": {
    "departureDays": ["Monday", "Wednesday", "Friday"],
    "fixedDepartures": [
      {
        "date": "2025-03-15T00:00:00.000Z",
        "availableSlots": 20,
        "status": "AVAILABLE"
      }
    ]
  },
  "difficulty": "MODERATE",
  "isActive": true,
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T10:30:00.000Z"
}
```

---

### 3. GET `/api/v1/tours/slug/:slug` - Tour theo slug (Public)

**Params:** `slug` (SEO-friendly URL)

**Response:** Giống endpoint GET by ID

---

### 4. GET `/api/v1/tours/featured` - Tours nổi bật (Public)

**Query:** `limit` (number, default: 6)

**Response:** Array of tours (giống items trong danh sách)

---

### 5. GET `/api/v1/tours/options` - Options cho dropdown (Public)

**Query:** `destinationId` (optional)

**Response:**
```json
[
  {
    "_id": "675abc123",
    "slug": "sapa-3-ngay-2-dem",
    "code": "TOUR-SAPA-001",
    "translations": { "vi": { "name": "..." }, "en": { "name": "..." } },
    "duration": { "days": 3, "nights": 2 },
    "pricing": { "basePrice": 2990000, "currency": "VND" }
  }
]
```

---

### 6. POST `/api/v1/tours` - Tạo tour (Admin)

**Headers:** `Authorization: Bearer {token}`

**Content-Type:** `multipart/form-data` (khi gửi ảnh) hoặc `application/json` (chỉ dữ liệu).

- **Ảnh gallery:** field name `gallery`, gửi nhiều file (tối đa 10). Ảnh đầu tiên dùng làm **thumbnail**, thứ tự giữ nguyên theo `order`.
- **Body (form fields):** các field giống JSON bên dưới, với object/array có thể stringify (ví dụ `duration`, `translations`, `itinerary`... gửi dạng string JSON).

**Body (JSON - khi không dùng form-data):**
```json
{
  "slug": "halong-2-ngay-1-dem",
  "code": "TOUR-HALONG-001",
  "isActive": true,
  "tourType": "DOMESTIC",
  "duration": { "days": 2, "nights": 1 },
  "destinations": [
    { "provinceId": "675provinceId1", "isMainDestination": true }
  ],
  "departureProvinceId": "675hanoi",
  "translations": {
    "vi": {
      "name": "Tour Hạ Long 2 ngày 1 đêm",
      "shortDescription": "Khám phá vịnh Hạ Long",
      "description": "Mô tả đầy đủ...",
      "highlights": ["Du thuyền 5 sao", "Động Thiên Cung"],
      "inclusions": ["Vé tàu", "Khách sạn"],
      "exclusions": ["Chi phí cá nhân"],
      "notes": ["Mang theo áo phao"],
      "cancellationPolicy": "Hoàn 100% nếu hủy trước 7 ngày",
      "seo": {
        "title": "Tour Hạ Long 2N1Đ",
        "description": "Đặt tour Hạ Long giá tốt",
        "keywords": ["halong bay", "tour halong"]
      }
    },
    "en": {
      "name": "Halong Bay 2D1N Tour",
      "shortDescription": "Discover Halong Bay"
    }
  },
  "itinerary": [
    {
      "dayNumber": 1,
      "translations": {
        "vi": {
          "title": "Hà Nội - Hạ Long",
          "description": "Xe đón và khởi hành...",
          "meals": ["Trưa", "Tối"],
          "accommodation": "Du thuyền 5 sao"
        }
      }
    }
  ],
  "capacity": { "minGuests": 2, "maxGuests": 30, "privateAvailable": true },
  "pricing": {
    "basePrice": 3500000,
    "currency": "VND",
    "childPrice": 2500000,
    "infantPrice": 500000,
    "singleSupplement": 800000
  },
  "contact": {
    "phone": "0987654321",
    "email": "tours@example.com",
    "hotline": "1900xxxx"
  },
  "amenities": ["675amenity1", "675amenity2"],
  "transportTypes": ["BUS", "BOAT"],
  "bookingConfig": {
    "advanceBookingDays": 3,
    "allowInstantBooking": true,
    "requireDeposit": true,
    "depositPercent": 30
  },
  "difficulty": "EASY"
}
```

**Response:** Tour object (có `thumbnail`, `gallery` nếu đã gửi ảnh) hoặc error (409: slug/code đã tồn tại, 400: province không hợp lệ)

---

### 7. PATCH `/api/v1/tours/:id` - Cập nhật tour (Admin)

**Headers:** `Authorization: Bearer {token}`

**Content-Type:** `multipart/form-data` (khi gửi ảnh mới) hoặc `application/json`.

- **Ảnh gallery:** field name `gallery`, tối đa 10 file. Khi gửi ảnh mới, toàn bộ gallery cũ sẽ bị thay thế; ảnh đầu tiên = thumbnail.
- **Body (form fields):** partial update, object/array gửi dạng string JSON nếu dùng form-data.

**Body (JSON - partial update):**
```json
{
  "isActive": false,
  "pricing": { "basePrice": 3200000, "currency": "VND" }
}
```

**Response:** Tour object hoặc error

---

### 8. DELETE `/api/v1/tours/:id` - Xóa tour (Admin)

**Headers:** `Authorization: Bearer {token}`

**Response:** Success hoặc 404 (Tour not found)

---

## ⭐ Reviews & Rating (Tour)

Collection **reviews** dùng chung cho Room, Hotel, **Tour**, Blog. Với tour: dùng `entityType: 'TOUR'` và `entityId` = ID tour.

### GET `/api/v1/reviews` - Danh sách review công khai (theo tour)

**Query:**

| Parameter | Type | Mô tả |
|-----------|------|--------|
| entityType | string | **TOUR** (bắt buộc khi lấy review tour) |
| entityId | string | Tour ID (MongoDB ObjectId) |
| page | number | Trang (default: 1) |
| limit | number | Số item/trang (default: 10) |

**Ví dụ:** `GET /api/v1/reviews?entityType=TOUR&entityId=675abc123&page=1&limit=10`

**Response:** Mảng review (chỉ review đã duyệt `isApproved: true`):

```json
[
  {
    "_id": "...",
    "entityType": "TOUR",
    "entityId": "675abc123",
    "rating": 5,
    "comment": "Tour rất hay!",
    "userId": "675user1",
    "isAnonymous": false,
    "isApproved": true,
    "createdAt": "2025-01-20T10:00:00.000Z"
  }
]
```

---

### GET `/api/v1/reviews/me` - Review của tôi cho một tour (Bearer)

**Headers:** `Authorization: Bearer {token}`

**Query:** `entityType=TOUR`, `entityId=<tourId>`

**Response:** Một review object hoặc null (chưa đánh giá).

---

### POST `/api/v1/reviews` - Gửi / cập nhật đánh giá tour (Bearer)

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

| Field | Type | Bắt buộc | Mô tả |
|-------|------|----------|--------|
| entityType | string | Có | **TOUR** |
| entityId | string | Có | Tour ID |
| rating | number | Không* | 1–5 (*cần ít nhất rating hoặc comment) |
| comment | string | Không* | Nội dung đánh giá |
| isAnonymous | boolean | Không | Default: false |

- Mỗi user chỉ có **một review** cho một tour: gửi lại = cập nhật (upsert).
- Sau khi gửi, **ratingSummary** của tour (average, total) được cập nhật tự động.

**Response:** Review document (đã lưu).

---

### PATCH `/api/v1/reviews/:id/approve` - Duyệt review (Admin)

**Headers:** `Authorization: Bearer {token}` (Admin)

**Response:** Review đã duyệt. Sau khi duyệt, `ratingSummary` của tour được recalculate.

---

### DELETE `/api/v1/reviews/:id` - Xóa review (Admin)

**Response:** Thành công. `ratingSummary` của tour được cập nhật lại.

---

### GET `/api/v1/reviews/admin` - Danh sách review (Admin)

**Query:** `entityType=TOUR`, `isApproved=true|false`, `page`, `limit`

**Response:**

```json
{
  "data": [ { ... review, userId populated (username, email) } ],
  "pagination": { "page": 1, "limit": 20, "total": 100 }
}
```

---

## 🎨 Data Structures (TypeScript)

### Tour Object (Full)

```typescript
interface Tour {
  _id: string;
  slug: string;
  code: string;
  isActive: boolean;
  tourType: 'DOMESTIC' | 'INTERNATIONAL' | 'DAILY';
  
  // Duration
  duration: {
    days: number;
    nights: number;
  };
  
  // Destinations
  destinations: Array<{
    provinceId: string | Province;
    isMainDestination: boolean;
  }>;
  departureProvinceId: string | Province;
  
  // Translations
  translations: {
    [lang: string]: {
      name: string;
      description?: string;
      shortDescription?: string;
      highlights?: string[];
      inclusions?: string[];
      exclusions?: string[];
      notes?: string[];
      cancellationPolicy?: string;
      seo?: {
        title?: string;
        description?: string;
        keywords?: string[];
      };
    };
  };
  
  // Itinerary
  itinerary: Array<{
    dayNumber: number;
    translations: {
      [lang: string]: {
        title: string;
        description: string;
        meals?: string[];
        accommodation?: string;
      };
    };
  }>;
  
  // Capacity
  capacity: {
    minGuests: number;
    maxGuests: number;
    privateAvailable: boolean;
  };
  
  // Pricing
  pricing: {
    basePrice: number;
    currency: string;
    childPrice?: number;
    infantPrice?: number;
    singleSupplement?: number;
  };
  
  // Contact
  contact?: {
    phone?: string;
    email?: string;
    hotline?: string;
  };
  
  // Media
  thumbnail?: {
    url: string;
    publicId?: string;
    alt?: string;
  };
  gallery: Array<{
    url: string;
    publicId?: string;
    alt?: string;
    order?: number;
  }>;
  
  // Amenities & Transport
  amenities: string[] | Amenity[];
  transportTypes: string[];
  
  // Booking Config
  bookingConfig: {
    advanceBookingDays: number;
    allowInstantBooking: boolean;
    requireDeposit: boolean;
    depositPercent: number;
  };
  
  // Sale
  sale?: {
    isActive: boolean;
    type: 'PERCENT' | 'FIXED';
    value: number;
    startDate?: Date;
    endDate?: Date;
  };
  
  // Rating
  ratingSummary: {
    average: number;
    total: number;
  };
  
  // Schedule
  schedule: {
    departureDays?: string[];
    fixedDepartures?: Array<{
      date: Date;
      availableSlots: number;
      status: string;
    }>;
  };
  
  difficulty: 'EASY' | 'MODERATE' | 'CHALLENGING' | 'DIFFICULT';
  createdAt: Date;
  updatedAt: Date;
}
```

### Query Params

```typescript
interface TourQueryParams {
  page?: number;
  limit?: number;
  destinationId?: string;
  departureProvinceId?: string;
  tourType?: 'DOMESTIC' | 'INTERNATIONAL' | 'DAILY';
  minDays?: number;
  maxDays?: number;
  minPrice?: number;
  maxPrice?: number;
  difficulty?: 'EASY' | 'MODERATE' | 'CHALLENGING' | 'DIFFICULT';
  sortBy?: 'price_asc' | 'price_desc' | 'duration_asc' | 'duration_desc' | 'rating' | 'newest';
  search?: string;
  transportTypes?: string[];
}
```

### Paginated Response

```typescript
interface TourPaginatedResponse {
  items: Tour[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

---

## ⚠️ Error Codes

| Code | Message | Meaning |
|------|---------|---------|
| 400 | Invalid tour ID | ID không hợp lệ |
| 400 | Invalid departure province | Province không tồn tại |
| 404 | Tour not found | Không tìm thấy tour |
| 409 | Tour slug already exists | Slug đã tồn tại |
| 409 | Tour code already exists | Code đã tồn tại |
| 401 | Unauthorized | Chưa authenticate |
| 403 | Forbidden | Không có quyền |

---

## 📝 Notes

### Enums
- **tourType**: `DOMESTIC` (trong nước), `INTERNATIONAL` (quốc tế), `DAILY` (tour ngày)
- **difficulty**: `EASY` (dễ), `MODERATE` (trung bình), `CHALLENGING` (khó), `DIFFICULT` (rất khó)
- **sortBy**: `price_asc`, `price_desc`, `duration_asc`, `duration_desc`, `rating`, `newest`
- **sale.type**: `PERCENT` (phần trăm), `FIXED` (số tiền cố định)

### Populated Fields
Khi gọi API, các fields sau sẽ được populate (có full object thay vì chỉ ID):
- `destinations.provinceId` → Province object
- `departureProvinceId` → Province object
- `amenities` → Array of Amenity objects

### Multi-language
Field `translations` chứa nhiều ngôn ngữ (vi, en, ...). Frontend tự chọn ngôn ngữ phù hợp:
```typescript
const tourName = tour.translations[currentLang]?.name || tour.translations.vi?.name;
```

---

**Version:** 1.0.0  
**Last Updated:** 2025-02-04
