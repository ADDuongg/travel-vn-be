# TourGuide Module - Implementation Plan

## Tổng quan

Module quản lý hướng dẫn viên du lịch (Tour Guide). Guide là một user có role `'guide'` với profile chuyên nghiệp riêng biệt.

**Thiết kế chính:** Tách TourGuide thành collection riêng, link tới User qua `userId` (1-1 relationship).

**Lý do:**

- User schema giữ gọn, chỉ chứa identity/auth + profile cơ bản
- TourGuide chứa professional info, dễ query riêng (list guides, filter, public profile)
- Dễ mở rộng sau (schedule, earnings, assignment history)
- Không phải mọi user đều cần guide data

**Liên quan đến:**

- `UserModule` — cần nâng cấp schema (thêm fullName, phone, avatar...)
- `AuthModule` — cập nhật register/me trả đầy đủ profile
- `TourBookingModule` — thêm `guideId` vào booking
- `ReviewModule` — thêm `GUIDE` entity type

**Admin UI:** Quản lý Tour Guide **tách riêng** — menu/khu vực "Hướng dẫn viên" riêng, không gộp CRUD guide vào màn list User. API CRUD TourGuide dùng resource `/api/v1/tour-guides`.

**Flow đăng ký HDV (chốt):** Hướng 1 — User tự đăng ký. Client có **một màn** trong dashboard (sau khi login) để user "Đăng ký làm HDV", gửi form → backend tạo TourGuide + thêm role `guide` → user **chờ admin verify**; sau khi verify mới hiện trên listing public.

---

## PHASE A: Nâng cấp User Schema

> Làm trước vì TourGuide phụ thuộc User.

### A1. User Schema — thêm fields

**File:** `src/user/schema/user.schema.ts`

```typescript
@Schema({ collection: 'user', timestamps: true })
export class User {
  // === Giữ nguyên ===
  @Prop({ required: true, unique: true, index: true })
  username: string;

  @Prop()
  password: string;

  @Prop({ type: [String], default: [], index: true })
  roles: string[];  // 'user' | 'admin' | 'guide'

  @Prop({ unique: true, sparse: true })
  email?: string;

  @Prop({ default: true })
  isActive: boolean;

  // === Thêm mới ===
  @Prop()
  fullName?: string;

  @Prop({ sparse: true })
  phone?: string;

  @Prop({
    type: { url: String, publicId: String },
  })
  avatar?: {
    url: string;
    publicId?: string;
  };

  @Prop()
  dateOfBirth?: Date;

  @Prop({ enum: ['male', 'female', 'other'] })
  gender?: string;

  @Prop({
    type: {
      province: String,
      district: String,
      detail: String,
    },
  })
  address?: {
    province?: string;
    district?: string;
    detail?: string;
  };

  // === Xoá field `age` (thay bằng dateOfBirth) ===
}
```

### A2. Update DTOs

**CreateUserDto** — thêm optional fields: `fullName`, `phone`, `avatar`, `dateOfBirth`, `gender`, `address`

**UpdateUserDto** — PartialType(CreateUserDto), bỏ `username` và `password` ra khỏi updatable

**RegisterDto** — cho phép thêm `fullName`, `phone`, `email` khi đăng ký

### A3. Update UserService

- `updateProfile(userId, dto)` — cập nhật profile (chỉ owner hoặc admin)
- `findOneById()` — trả đầy đủ profile (không chỉ `_id username roles`)

### A4. Update UserController

| Method | Endpoint                   | Description          | Auth       |
| ------ | -------------------------- | -------------------- | ---------- |
| PATCH  | `/api/v1/users/profile/me` | Update own profile   | Auth(user) |
| GET    | `/api/v1/users/:id`        | Get user profile     | Admin      |
| PATCH  | `/api/v1/users/:id`        | Admin update user    | Admin      |
| GET    | `/api/v1/users`            | List users           | Admin      |

### A5. Update AuthService.me()

Trả về đầy đủ thông tin user (trừ password) + `permissions`

### A6. Checklist Phase A

| #   | Task                                       | Status  |
| --- | ------------------------------------------ | ------- |
| A1  | Nâng cấp User schema (thêm fields)        | [x]     |
| A2  | Update CreateUserDto + validation          | [x]     |
| A3  | Update UpdateUserDto                       | [x]     |
| A4  | Update RegisterDto (fullName, phone)       | [x]     |
| A5  | UserService — updateProfile method         | [x]     |
| A6  | UserController — PATCH /profile endpoint   | [x]     |
| A7  | AuthService.me() — trả đầy đủ profile     | [x]     |
| A8  | Migration: xoá field `age`, map sang data  | [x]     |

---

## PHASE B: TourGuide Module

### B1. Cấu trúc thư mục

```
src/tour-guide/
├── tour-guide.module.ts
├── tour-guide.controller.ts
├── tour-guide.service.ts
├── tour-guide.types.ts
├── schema/
│   └── tour-guide.schema.ts
└── dto/
    ├── create-tour-guide.dto.ts
    ├── update-tour-guide.dto.ts
    └── tour-guide-query.dto.ts
```

### B2. TourGuide Schema

**File:** `src/tour-guide/schema/tour-guide.schema.ts`

```typescript
@Schema({ collection: 'tour_guides', timestamps: true })
export class TourGuide {
  // === Link to User (1-1) ===
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId: Types.ObjectId;

  // === Multi-language bio ===
  @Prop({ type: Object })
  translations: {
    [langCode: string]: {
      bio: string;
      shortBio?: string;
      specialties?: string; // "Chuyên gia văn hóa miền Trung"
    };
  };

  // === Professional Info ===
  @Prop({ type: [String], default: [] })
  languages: string[];  // ['vi', 'en', 'fr', 'zh', 'ja', 'ko']

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Province' }], default: [] })
  specializedProvinces: Types.ObjectId[];

  @Prop({ type: [String], default: [] })
  certifications: string[];

  @Prop()
  licenseNumber?: string;  // Số thẻ HDV (Tổng cục Du lịch)

  @Prop()
  yearsOfExperience?: number;

  // === Media ===
  @Prop({
    type: [{ url: String, publicId: String, alt: String }],
    default: [],
  })
  gallery: Array<{ url: string; publicId?: string; alt?: string }>;

  // === CV (file upload) ===
  @Prop({
    type: { url: String, publicId: String, filename: String },
  })
  cv?: {
    url: string;
    publicId?: string;
    filename?: string;
  };

  // === Rating (auto-update từ Review) ===
  @Prop({
    type: { average: Number, total: Number },
    default: { average: 0, total: 0 },
  })
  ratingSummary: { average: number; total: number };

  // === Status ===
  @Prop({ default: true })
  isAvailable: boolean;

  @Prop({ default: true })
  isActive: boolean;  // Soft delete

  @Prop({ default: false })
  isVerified: boolean;  // Admin đã xác minh

  @Prop()
  verifiedAt?: Date;

  // === Pricing ===
  @Prop()
  dailyRate?: number;

  @Prop({ default: 'VND' })
  currency: string;

  // === Contact preference ===
  @Prop({ type: [String], default: [] })
  contactMethods: string[];  // ['phone', 'zalo', 'email']
}
```

### B3. Database Indexes

```typescript
TourGuideSchema.index({ userId: 1 }, { unique: true });
TourGuideSchema.index({ isActive: 1 });
TourGuideSchema.index({ isVerified: 1 });
TourGuideSchema.index({ isAvailable: 1 });
TourGuideSchema.index({ specializedProvinces: 1 });
TourGuideSchema.index({ languages: 1 });
TourGuideSchema.index({ 'ratingSummary.average': -1 });
TourGuideSchema.index({ isActive: 1, isVerified: 1, isAvailable: 1 });
```

### B4. API Endpoints

| Method | Endpoint                              | Description                         | Auth       |
| ------ | ------------------------------------- | ----------------------------------- | ---------- |
| GET    | `/api/v1/tour-guides`                 | Danh sách guides (filter, paginate) | Public     |
| GET    | `/api/v1/tour-guides/:id`             | Chi tiết guide (populate user info) | Public     |
| GET    | `/api/v1/tour-guides/:id/reviews`     | Reviews của guide                   | Public     |
| POST   | `/api/v1/tour-guides`                 | Admin tạo guide profile cho user    | Admin      |
| POST   | `/api/v1/tour-guides/register`        | User tự đăng ký làm guide           | Auth(user) |
| PATCH  | `/api/v1/tour-guides/my-profile`      | Guide cập nhật profile mình (+ CV)  | Auth(guide)|
| PATCH  | `/api/v1/tour-guides/:id`             | Admin cập nhật guide (+ CV)         | Admin      |
| PATCH  | `/api/v1/tour-guides/:id/verify`      | Admin verify/unverify guide         | Admin      |
| PATCH  | `/api/v1/tour-guides/:id/availability`| Admin toggle available              | Admin      |
| DELETE | `/api/v1/tour-guides/:id`             | Soft delete guide (xem B6)           | Admin      |

### B5. Query Filters (GET /tour-guides)

| Param         | Type     | Description                     |
| ------------- | -------- | ------------------------------- |
| provinceId    | ObjectId | Filter theo tỉnh chuyên dẫn    |
| language      | string   | Filter theo ngôn ngữ           |
| isVerified    | boolean  | Chỉ guide đã xác minh          |
| isAvailable   | boolean  | Đang available                  |
| minRating     | number   | Rating tối thiểu               |
| search        | string   | Tìm theo tên (fullName ở User) |
| sort          | string   | rating / experience / newest    |
| page          | number   | Trang                           |
| limit         | number   | Số item/trang (max 50)          |

### B6. Business Logic

#### Guide Registration Flow

**Client:** Một màn trong dashboard (sau khi user đã login) — "Đăng ký làm HDV" — user điền form (bio, ngôn ngữ, tỉnh, bằng cấp…) và gửi; sau đó thấy trạng thái "Chờ duyệt" cho đến khi admin verify.

**Backend:**

```
1. User (đã login) gọi POST /tour-guides/register
2. Tạo TourGuide document (isVerified: false)
3. Thêm 'guide' vào user.roles
4. Admin review → PATCH /tour-guides/:id/verify
5. Guide được hiện trên public listing (isVerified: true)
```

#### Delete (Soft) Flow

- **DELETE** `/api/v1/tour-guides/:id` = thu hồi quyền HDV, **không** xoá tài khoản User.
- Logic:
  1. Set `TourGuide.isActive = false` (soft delete).
  2. Remove role `'guide'` khỏi `User.roles` (user vẫn đăng nhập bình thường, chỉ không còn là guide).
- Xoá tài khoản User (nếu có) là hành động riêng ở quản lý User, không nằm trong API TourGuide.

#### Guide Public Profile Response

```typescript
{
  _id: "...",
  user: {
    _id: "...",
    fullName: "Nguyễn Văn A",
    avatar: { url: "..." },
    // KHÔNG trả password, email riêng tư, etc.
  },
  translations: { vi: { bio: "...", shortBio: "..." } },
  languages: ["vi", "en"],
  specializedProvinces: [{ _id: "...", name: "Đà Nẵng" }],
  certifications: ["Thẻ HDV quốc tế"],
  licenseNumber: "HDV-12345",
  yearsOfExperience: 5,
  gallery: [...],
  ratingSummary: { average: 4.8, total: 120 },
  isAvailable: true,
  isVerified: true,
  dailyRate: 1500000,
  currency: "VND",
  contactMethods: ["phone", "zalo"],
}
```

### B7. Checklist Phase B

| #   | Task                                           | Status  |
| --- | ---------------------------------------------- | ------- |
| B1  | TourGuide schema + indexes                     | [x]     |
| B2  | CreateTourGuideDto + validation                | [x]     |
| B3  | UpdateTourGuideDto                             | [x]     |
| B4  | TourGuideQueryDto                              | [x]     |
| B5  | TourGuideService — CRUD + queries              | [x]     |
| B6  | TourGuideService — register flow               | [x]     |
| B7  | TourGuideService — verify flow                 | [x]     |
| B8  | TourGuideService — rating auto-update          | [ ] (Phase C) |
| B9  | TourGuideController — all endpoints            | [x]     |
| B10 | TourGuideModule — register in app.module.ts    | [x]     |
| B11 | TourGuide types (Frontend)                     | [x]     |

---

## PHASE C: Tích hợp với modules hiện có

### C1. Review Module — thêm GUIDE entity type

**File:** `src/review/schema/ewview.schema.ts`

```typescript
export enum ReviewEntityType {
  ROOM = 'ROOM',
  HOTEL = 'HOTEL',
  TOUR = 'TOUR',
  BLOG = 'BLOG',
  GUIDE = 'GUIDE',  // ← Thêm
}
```

Khi tạo review cho GUIDE → auto-update `tourGuide.ratingSummary`

### C2. TourBooking — thêm guideId

**File:** `src/tour-booking/schema/tour-booking.schema.ts`

```typescript
// Thêm field:
@Prop({ type: Types.ObjectId, ref: 'TourGuide' })
guideId?: Types.ObjectId;
```

Cho phép:
- Admin assign guide vào booking
- Hoặc khách chọn guide khi book (tuỳ business rule)

### C3. Checklist Phase C

| #   | Task                                              | Status  |
| --- | ------------------------------------------------- | ------- |
| C1  | ReviewEntityType — thêm GUIDE                     | [x]     |
| C2  | ReviewService — auto-update guide ratingSummary    | [x]     |
| C3  | TourBooking schema — thêm guideId                 | [x]     |
| C4  | TourBookingService — assign guide logic            | [x]     |

---

## PHASE D: FE API Documentation

| #   | Task                                                       | Status  |
| --- | ---------------------------------------------------------- | ------- |
| D1  | docs/FE-API-TOUR-GUIDE-CLIENT.md + docs/FE-API-TOUR-GUIDE-ADMIN.md | [x]     |
| D2  | Cập nhật docs/FE-API-AUTH.md (profile mới)                 | [ ]     |

---

## Database Relationships (Updated)

```
User (1) ────── (1) TourGuide
                      │
                      │ specializedProvinces
                      ▼
                   Province

TourBooking (N) ──> (1) TourGuide   (guideId, optional)

Review (entityType=GUIDE) ──> (1) TourGuide (entityId)

Tour (N) ──> (N) TourGuide  (thông qua TourBooking)
```

---

## Thứ tự implement

| Step | Phase | Task                                    | Depends on |
| ---- | ----- | --------------------------------------- | ---------- |
| 1    | A     | Nâng cấp User schema                   | —          |
| 2    | A     | Update User DTOs + validation           | Step 1     |
| 3    | A     | Update UserService + UserController     | Step 2     |
| 4    | A     | Update RegisterDto + AuthService.me()   | Step 2     |
| 5    | B     | TourGuide schema + indexes              | Step 1     |
| 6    | B     | TourGuide DTOs                          | Step 5     |
| 7    | B     | TourGuideService (CRUD + register)      | Step 6     |
| 8    | B     | TourGuideController                     | Step 7     |
| 9    | B     | Register module trong app.module.ts     | Step 8     |
| 10   | C     | ReviewEntityType thêm GUIDE             | Step 5     |
| 11   | C     | TourBooking thêm guideId               | Step 5     |
| 12   | D     | FE API documentation                    | Step 8     |

---

**Plan Status:** Phase A, B, C & D (docs TOUR-GUIDE) completed
**Created:** 2026-02-24
**Version:** 1.0.0
