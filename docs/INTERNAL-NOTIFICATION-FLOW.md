## Tổng quan hệ thống Notification

- **Kiểu thông báo**: In-app notification (lưu trong MongoDB) + Email (gửi qua Resend).
- **Cơ chế**: Bất đồng bộ qua **event emitter + BullMQ + Redis**.
- **Thành phần chính**:
  - `NotificationModule`
  - `Notification` schema (Mongo)
  - `NotificationService`
  - `NotificationController`
  - `NotificationListener` (lắng nghe event domain)
  - `NotificationProcessor` (BullMQ worker xử lý queue)
  - Các **event** và **type** ở `notification.constants.ts`

Toàn bộ logic được dùng chung cho FE Admin và FE Client.

---

## 1. Data model & schema

- File: `src/notification/schema/notification.schema.ts`
- Collection: `notifications`

Các field chính:

- `recipientId: ObjectId` – user nhận thông báo (ref tới `User`).
- `type: NotificationType` – enum:
  - `GUIDE_REGISTRATION_PENDING`
  - `GUIDE_VERIFIED`
  - `GUIDE_REJECTED`
- `title: string` – tiêu đề.
- `message: string` – nội dung tóm tắt.
- `metadata: object` – data phụ trợ (vd: `{ guideId, userId }`).
- `isRead: boolean` – đã đọc hay chưa.
- `readAt?: Date` – thời điểm đọc.
- `link?: string` – URL FE điều hướng khi click.

Indexes:

- `{ recipientId, isRead, createdAt }` – tối ưu query theo user + trạng thái đọc.
- TTL index `{ createdAt }` với `expireAfterSeconds` ~90 ngày → tự động xóa thông báo cũ.

---

## 2. Hằng số & event

- File: `src/notification/notification.constants.ts`

```ts
export const NOTIFICATION_QUEUE = 'notification';

export enum NotificationEvent {
  GUIDE_REGISTERED = 'guide.registered',
  GUIDE_VERIFIED = 'guide.verified',
}

export enum NotificationType {
  GUIDE_REGISTRATION_PENDING = 'GUIDE_REGISTRATION_PENDING',
  GUIDE_VERIFIED = 'GUIDE_VERIFIED',
  GUIDE_REJECTED = 'GUIDE_REJECTED',
}
```

- `NotificationEvent.*` dùng cho **event emitter** (domain events).
- `NotificationType.*` lưu trong DB + FE dùng để filter.

---

## 3. NotificationService (CRUD cho notification)

- File: `src/notification/notification.service.ts`

Chức năng:

- **`create` / `createMany`** – tạo 1 hoặc nhiều thông báo:
  - Tự convert `recipientId: string` → `Types.ObjectId`.
- **`findByRecipient(recipientId, query)`**:
  - Lọc theo:
    - `recipientId`
    - `isRead?: boolean`
    - `type?: NotificationType`
  - Phân trang với `page`, `limit`.
  - Trả về `{ items, total, page, limit }`.
- **`getUnreadCount(recipientId)`** – đếm số notification chưa đọc.
- **`markAsRead(notificationId, recipientId)`** – đánh dấu 1 notification là đã đọc.
- **`markAllAsRead(recipientId)`** – update tất cả chưa đọc → đã đọc.

Service này được dùng:

- Bởi `NotificationController` (API cho FE).
- Bởi `NotificationProcessor` (tạo notification khi xử lý job).

---

## 4. NotificationController (API cho FE)

- File: `src/notification/notification.controller.ts`
- Base path: `/api/v1/notifications`
- Guard: `@UseGuards(JwtAuthGuard)` → yêu cầu JWT, lấy `req.user.userId` từ `JwtStrategy`.

Endpoints:

- `GET /` – lấy danh sách notification của user hiện tại:
  - Query: `page`, `limit`, `isRead`, `type`.
  - Gọi `notificationService.findByRecipient(userId, query)`.
- `GET /unread-count` – trả về `{ count }` số lượng chưa đọc.
- `PATCH /:id/read` – đánh dấu 1 notification (thuộc về user hiện tại) là đã đọc.
- `PATCH /read-all` – đánh dấu toàn bộ notification của user hiện tại là đã đọc.

FE Admin và FE Client đều dùng chung các API này, khác nhau ở `type` và `metadata`.

---

## 5. Event emitter & NotificationListener

### 5.1. Nơi phát event (domain)

Ví dụ trong `TourGuideService`:

- File: `src/tour-guide/tour-guide.service.ts`

- Khi **user đăng ký tour guide** (`register()`):
  - Tạo document `TourGuide` mới.
  - Gán role `guide` cho user.
  - Emit event:
    - `NotificationEvent.GUIDE_REGISTERED`
    - Payload: `GuideRegisteredEvent(guideId, userId, userName, userEmail)`.

- Khi **admin verify / unverify tour guide** (`verify()`):
  - Update `isVerified`, `verifiedAt`.
  - Emit event:
    - `NotificationEvent.GUIDE_VERIFIED`
    - Payload: `GuideVerifiedEvent(guideId, userId, userName, userEmail, isVerified)`.

### 5.2. Listener → đẩy job vào queue

- File: `src/notification/notification.listener.ts`
- Decorator: `@OnEvent(NotificationEvent.XXX)`

Ví dụ:

- `onGuideRegistered(event: GuideRegisteredEvent)`:
  - Ghi log.
  - `notificationQueue.add('guide-registered', data, options)`:
    - `data`: `{ guideId, userId, userName, userEmail }`.
    - `options`: retry, backoff, removeOnComplete, v.v.
- `onGuideVerified(event: GuideVerifiedEvent)`:
  - `notificationQueue.add('guide-verified', data, options)`.

Như vậy: **domain layer không nói chuyện trực tiếp với Mongo/email**, mà chỉ emit event. Notification module nghe event và đẩy sang queue → decouple & tránh block request.

---

## 6. BullMQ Processor (NotificationProcessor)

- File: `src/notification/notification.processor.ts`
- Decorator: `@Processor(NOTIFICATION_QUEUE)`
- Implement `WorkerHost` → có `async process(job)` để xử lý job.

Luồng:

1. `process(job)`:
   - Switch theo `job.name`:
     - `'guide-registered'` → `handleGuideRegistered`.
     - `'guide-verified'` → `handleGuideVerified`.
2. `handleGuideRegistered(data)`:
   - Lấy danh sách admin (`User` có `roles: 'admin', isActive: true`).
   - Tạo **in-app notification** cho tất cả admin:
     - `type: GUIDE_REGISTRATION_PENDING`
     - `title`, `message`, `metadata: { guideId, userId }`
     - `link: /admin/tour-guides/:guideId`
   - Gửi **email** cho admin(s) (từ `ADMIN_EMAIL` env + email của user role admin) dùng `EmailService` + template `guideRegisteredTemplate`.
3. `handleGuideVerified(data)`:
   - Tính `type`:
     - Nếu `isVerified === true` → `GUIDE_VERIFIED`.
     - Ngược lại → `GUIDE_REJECTED`.
   - Tạo **in-app notification** cho chính user (guide):
     - `recipientId: data.userId`
     - `link: /guide/my-profile`
   - Gửi **email** cho user (nếu có `userEmail`) dùng template `guideVerifiedTemplate`.

Ngoài ra có:

- `@OnWorkerEvent('failed')` – log khi job fail.
- `@OnWorkerEvent('completed')` – log khi job thành công.

---

## 7. Cấu hình Redis & BullMQ

- File: `src/app.module.ts`

```ts
BullModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    connection: {
      host: config.get<string>('REDIS_HOST', 'localhost'),
      port: config.get<number>('REDIS_PORT', 6379),
      password: config.get<string>('REDIS_PASSWORD') || undefined,
    },
  }),
}),
```

Trong `.env`:

- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD` (optional)

NotificationModule:

- File: `src/notification/notification.module.ts`
- Đăng ký queue:

```ts
BullModule.registerQueue({ name: NOTIFICATION_QUEUE });
```

Yêu cầu runtime:

- Redis phải chạy.
- App NestJS chạy để:
  - Lắng nghe HTTP (API).
  - Chạy worker BullMQ (processor) trong cùng process (vì dùng `@Processor`).

---

## 8. API FE đã có (tóm tắt nhanh)

Chi tiết ở `docs/FE-API-NOTIFICATION.md`, ở đây chỉ nhắc lại:

- `GET /api/v1/notifications?page=&limit=&isRead=&type=`
  - Trả về danh sách notification + phân trang.
- `GET /api/v1/notifications/unread-count`
  - Trả về `{ count }` số lượng chưa đọc.
- `PATCH /api/v1/notifications/:id/read`
  - Đánh dấu 1 notification đã đọc.
- `PATCH /api/v1/notifications/read-all`
  - Đánh dấu tất cả notification của user hiện tại đã đọc.

---

## 9. Tóm tắt flow quan trọng

### 9.1. User đăng ký làm tour guide

1. FE Client gọi `POST /api/v1/tour-guides/register`.
2. `TourGuideService.register()` tạo profile, add role `guide`, emit `GUIDE_REGISTERED`.
3. `NotificationListener` thêm job `'guide-registered'` vào queue.
4. `NotificationProcessor.handleGuideRegistered()`:
   - Tạo in-app notification `GUIDE_REGISTRATION_PENDING` cho admin.
   - Gửi email cho admin(s).
5. FE Admin poll `GET /notifications` hoặc `GET /notifications/unread-count` → thấy thông báo mới.

### 9.2. Admin verify / reject tour guide

1. FE Admin gọi `PATCH /api/v1/tour-guides/:id/verify` với `{ isVerified: true/false }`.
2. `TourGuideService.verify()` cập nhật guide + emit `GUIDE_VERIFIED`.
3. `NotificationListener` thêm job `'guide-verified'` vào queue.
4. `NotificationProcessor.handleGuideVerified()`:
   - Tạo in-app notification:
     - Nếu `true` → type `GUIDE_VERIFIED`.
     - Nếu `false` → type `GUIDE_REJECTED`.
   - Gửi email cho user tương ứng.
5. FE Client (guide) poll `GET /notifications` hoặc `GET /notifications/unread-count` → thấy thông báo về trạng thái hồ sơ.

---

## 10. Khi nào cần lưu ý

- Nếu **Redis không chạy**:
  - Event vẫn emit, nhưng job không được xử lý → **không có notification mới** (in-app + email).
  - API `GET /notifications` vẫn đọc dữ liệu cũ trong MongoDB.
- Nếu thấy MongoDB có document nhưng FE gọi API trả `items: []`:
  - Kiểm tra lại:
    - `recipientId` trong DB có trùng `sub` của JWT không.
    - Có filter `type` hoặc `isRead` trên FE không.
    - Database name trong `.env` có trùng DB đang xem trong Compass không.

