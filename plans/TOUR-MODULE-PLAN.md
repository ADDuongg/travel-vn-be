# Tour Module - Implementation Plan

## 📋 Tổng quan

Module quản lý tour du lịch với đầy đủ tính năng: thông tin tour, lịch trình, giá cả, booking, và đánh giá.

**Patterns áp dụng:**
- Multi-language translations (vi, en, ...)
- Province relationships (destinations)
- Media management (Cloudinary)
- Amenities/Inclusions/Exclusions
- Pricing & Sale/Discount
- Rating summary
- Soft delete (isActive flag)

---

## ✅ PHẦN I: MVP - HOÀN THÀNH

### 1. Cấu trúc thư mục (Đã tạo)

```
src/tour/
├── tour.module.ts          ✅
├── tour.controller.ts      ✅
├── tour.service.ts         ✅
├── tour.types.ts           ✅
├── dto/
│   ├── create-tour.dto.ts  ✅
│   ├── update-tour.dto.ts  ✅
│   └── tour-query.dto.ts   ✅
└── schema/
    └── tour.schema.ts      ✅

docs/
└── FE-API-TOUR.md          ✅ (API documentation for Frontend)
```

---

### 2. Features đã implement

#### ✅ Core Features
- **Schema**: Tour schema với sub-schemas (TourItineraryDay, TourDestination, TourContact, TourPricing)
- **DTOs**: Create, Update, Query DTOs với validation đầy đủ
- **Service**: CRUD operations + advanced queries
- **Controller**: 8 RESTful endpoints
- **Types**: TypeScript interfaces cho Frontend

#### ✅ Data Structure
- Multi-language translations (vi, en)
- Province relationships (destinations, departure)
- Duration (days, nights)
- Capacity (min/max guests, private available)
- Pricing (base, child, infant, single supplement)
- Contact info
- Media (thumbnail, gallery)
- Amenities & transport types
- Booking config (advance days, deposit %)
- Sale/Discount
- Rating summary
- Schedule (departure days, fixed departures)
- Difficulty levels

#### ✅ Advanced Queries
- **Filters**: destinationId, departureProvinceId, tourType, price range, duration range, difficulty, transport types
- **Sort**: price (asc/desc), duration (asc/desc), rating, newest
- **Search**: by name or code
- **Pagination**: page, limit (max 50)

---

### 3. API Endpoints (8 endpoints)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/tours` | Danh sách tours (filter, sort, pagination) | Public |
| GET | `/api/v1/tours/:id` | Chi tiết tour theo ID | Public |
| GET | `/api/v1/tours/slug/:slug` | Chi tiết tour theo slug | Public |
| GET | `/api/v1/tours/options` | Options cho dropdown | Public |
| GET | `/api/v1/tours/featured` | Tours nổi bật (sort by rating) | Public |
| POST | `/api/v1/tours` | Tạo tour mới | Admin |
| PATCH | `/api/v1/tours/:id` | Cập nhật tour | Admin |
| DELETE | `/api/v1/tours/:id` | Xóa tour (soft delete) | Admin |

**📚 Chi tiết API:** Xem file `docs/FE-API-TOUR.md`

---

### 4. Database Indexes

```typescript
// Performance indexes đã tạo
- slug (unique)
- code (unique)
- isActive
- tourType
- destinations.provinceId
- departureProvinceId
- pricing.basePrice
- duration.days
- ratingSummary.average (desc)
- createdAt (desc)

// Compound indexes
- isActive + tourType
- destinations.provinceId + isActive
```

---

### 5. Implementation Checklist

| # | Task | Status |
|---|------|--------|
| 1 | Schema với sub-schemas | ✅ Done |
| 2 | Create Tour DTO (all sub-DTOs) | ✅ Done |
| 3 | Update Tour DTO | ✅ Done |
| 4 | Tour Query DTO | ✅ Done |
| 5 | Tour Service (CRUD + queries) | ✅ Done |
| 6 | Tour Controller | ✅ Done |
| 7 | Tour Module | ✅ Done |
| 8 | Tour Types (Frontend) | ✅ Done |
| 9 | Register trong app.module.ts | ✅ Done |
| 10 | FE API Documentation | ✅ Done |

**Status:** MVP COMPLETED ✅

---

## 🚀 PHẦN II: ADVANCED FEATURES (Tương lai)

### Phase 2: Booking System

#### 2.1 TourInventoryModule
**Mục đích:** Quản lý số chỗ còn trống theo từng ngày khởi hành

**Features:**
- Track available slots per departure date
- Block/release slots (khi booking/cancel)
- Status management (AVAILABLE, LIMITED, FULL, CANCELLED)
- Special pricing per date

**APIs:**
- GET `/api/v1/tours/:id/availability?month=2025-03`
- POST `/api/v1/tour-inventory/block`
- POST `/api/v1/tour-inventory/release`

---

#### 2.2 TourBookingModule
**Mục đích:** Quản lý đặt tour

**Features:**
- Booking code generation
- Guest details management
- Pricing calculation (adults, children, infants)
- Deposit handling
- Status tracking (PENDING, CONFIRMED, PAID, CANCELLED, COMPLETED)
- Payment integration

**APIs:**
- POST `/api/v1/tour-bookings`
- GET `/api/v1/tour-bookings/:code`
- GET `/api/v1/tour-bookings/my-bookings`
- PATCH `/api/v1/tour-bookings/:id/confirm`
- PATCH `/api/v1/tour-bookings/:id/cancel`
- POST `/api/v1/tour-bookings/:id/payment`

---

### Phase 3: Reviews & Categories

#### 3.1 TourReviewModule
**Features:**
- Rating (1-5 stars)
- Detailed ratings (guide, transport, accommodation, meals, value)
- Photo uploads
- Verified reviews (from actual bookings)
- Helpful votes
- Auto-update ratingSummary

**APIs:**
- POST `/api/v1/tour-reviews`
- GET `/api/v1/tours/:id/reviews`
- PATCH `/api/v1/tour-reviews/:id/helpful`

---

#### 3.2 TourCategoryModule
**Features:**
- Category management (Adventure, Beach, Cultural, ...)
- Multi-language names
- Icons
- Order/sorting

**Update Tour Schema:**
```typescript
categories: Types.ObjectId[] // References to TourCategory
```

---

### Phase 4: Advanced Features

#### 4.1 TourGuideModule
- Guide profiles với ratings
- Specialized provinces
- Language skills
- Assignment to bookings

#### 4.2 Dynamic Pricing
- Seasonal pricing (cao điểm, thấp điểm)
- Early bird discount
- Last minute deals
- Group discount
- Pricing rules engine

#### 4.3 Tour Packages (Combo)
- Multi-tour packages
- Tour + hotel combos
- Multi-destination packages
- Discount calculations

#### 4.4 Waitlist System
- Auto-notify when slots available
- Priority booking for waitlisted guests

#### 4.5 Real-time Features
- Socket.IO for booking updates
- Email/SMS confirmations
- Push notifications

#### 4.6 Analytics & Reporting
- Tour performance metrics
- Booking trends
- Revenue reports
- Popular destinations dashboard

---

### Phase 5: Integrations

#### 5.1 Payment Gateway
- Stripe integration
- VNPay integration
- Momo integration
- Deposit handling
- Refund processing

#### 5.2 Communication
- Email service (booking confirmations, reminders)
- SMS gateway (booking confirmations, updates)

#### 5.3 Maps
- Google Maps integration
- Route visualization
- Location pins

---

### Phase 6: Performance & Security

#### 6.1 Performance
- Redis caching (featured tours, tour details)
- Elasticsearch (full-text search)
- CDN for images
- Image optimization (WebP, lazy loading)

#### 6.2 Security
- Rate limiting (booking endpoints)
- CAPTCHA (public forms)
- PCI compliance (payments)
- Data encryption

#### 6.3 Admin Features
- Dashboard (statistics, charts)
- Bulk operations (import from Excel/CSV)
- Automated tasks (reminders, auto-cancel)

---

## 🎯 Priority Roadmap

### ✅ Phase 1: MVP (Week 1-2) - COMPLETED
- ✅ Tour CRUD
- ✅ Advanced filtering & search
- ✅ Province relationships
- ✅ Multi-language support
- ✅ Pagination & sorting
- ✅ FE API Documentation

### Phase 2: Booking (Week 3-4)
- [ ] TourInventoryModule
- [ ] TourBookingModule
- [ ] Payment integration (VNPay/Momo)

### Phase 3: Reviews & Categories (Week 5-6)
- [ ] TourReviewModule
- [ ] TourCategoryModule
- [ ] Rating system với auto-update

### Phase 4: Advanced Features (Week 7-8)
- [ ] TourGuideModule
- [ ] Dynamic pricing engine
- [ ] Tour packages/combos

### Phase 5: Optimization (Week 9-10)
- [ ] Redis caching layer
- [ ] Elasticsearch integration
- [ ] Performance tuning
- [ ] Load testing

---

## 📊 Database Relationships

```
Province (1) ────< (N) Tour
                     │
                     │ (1)
                     │
                     ▼ (N)
               TourInventory
                     │
                     │ (1)
                     │
                     ▼ (N)
               TourBooking
                     │
                     ├─> (1) User
                     ├─> (1) Payment
                     ├─> (1) TourGuide
                     └─> (1) TourReview

Tour (N) ────< (N) TourCategory
Tour (N) ────< (N) Amenity
```

---

## 🧪 Testing Strategy

### Unit Tests
- Service methods (CRUD, queries, validations)
- DTO validations
- Business logic

### Integration Tests
- API endpoints
- Database operations
- Module interactions

### E2E Tests
- Complete booking flow
- Payment flow
- Cancellation flow
- Review submission flow

---

## 📚 Documentation

### ✅ Completed
- [x] API Documentation for Frontend (`docs/FE-API-TOUR.md`)
- [x] TypeScript interfaces
- [x] Implementation plan (this file)

### Todo
- [ ] Swagger/OpenAPI specs
- [ ] Postman collection
- [ ] Developer guide
- [ ] Deployment guide

---

## 🔗 Related Files

- **Schema**: `src/tour/schema/tour.schema.ts`
- **Service**: `src/tour/tour.service.ts`
- **Controller**: `src/tour/tour.controller.ts`
- **DTOs**: `src/tour/dto/*.dto.ts`
- **Types**: `src/tour/tour.types.ts`
- **FE API Docs**: `docs/FE-API-TOUR.md`

---

## 📝 Notes

### MVP Scope
MVP (Phase 1) đã hoàn thành với đầy đủ tính năng cơ bản:
- ✅ Tour management (CRUD)
- ✅ Advanced search & filtering
- ✅ Multi-language support
- ✅ Province relationships
- ✅ Media management (structure ready)
- ✅ Rating summary (structure ready)
- ✅ Soft delete

### Next Steps
1. **Test API endpoints** với Postman/Insomnia
2. **Seed sample data** vào database
3. **Frontend integration** (sử dụng `docs/FE-API-TOUR.md`)
4. **Phase 2**: Implement TourInventoryModule và TourBookingModule

### Important
- API đã sẵn sàng cho Frontend sử dụng
- Cần test kỹ các endpoints trước khi deploy production
- Cân nhắc thêm rate limiting cho public endpoints
- Cân nhắc thêm caching cho featured tours và tour details

---

**Plan Status:** Phase 1 (MVP) ✅ | Phase 2-5 Pending  
**Last Updated:** 2025-02-04  
**Version:** 1.0.0
