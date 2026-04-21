# PROJECT PATTERNS — VN Tours (NestJS)

Tài liệu này tóm tắt **các patterns/conventions đang dùng trong dự án** (đối chiếu giữa “chuẩn dự án” và code thực tế trong `src/`).

## 1) Kiến trúc tổng quan

- **Feature-based modules**: tách theo business capability (tour, booking, payment, review, hotel/room, auth/users, …).
- **Layering rõ ràng**:
  - **Controller**: HTTP layer (route/guards/DTO), gọi service, không chứa business logic nặng.
  - **Service**: orchestration + business rules, gọi repository/queue/cache/external services.
  - **Repository**: _tất cả_ query Mongoose nằm ở đây (không để `InjectModel` “rò rỉ” ra chỗ khác).

Luồng chuẩn:

- Request → Controller → Service → Repository → MongoDB
- Background work → BullMQ processor
- Cross-cutting → middleware / interceptors / filters / guards

## 2) Module composition pattern

Các module hiện có (không đầy đủ 100%, nhưng phản ánh cấu trúc repo):

- **Core / cross-cutting**: `env`, `shared`, `redis`, `health`, `idempotency`, `notification`, `socket`, `analytics`
- **Auth & RBAC**: `auth`, `roles`, `permission`, `api-role`, `api-permission`, `router-role`, `routers`, `otp`
- **Domain**:
  - Travel: `tour`, `tour-inventory`, `tour-booking`, `tour-guide`
  - Lodging: `hotel`, `room`, `booking`, `room-inventory`
  - Commerce: `product`, `orders`, `payment`
  - Content: `review`, `favorite`, `provinces`, `amenities`, `language`
  - Media: `upload`, `cloudinary`, `media`

### AppModule “wiring” pattern

- **ConfigModule global + Zod validate**: `.env` được load và validate ngay từ đầu (`validateEnv`).
- **Global infra** đăng ký “async” bằng `EnvService`: JWT, BullMQ, Pino logger, Mongoose.
- **Global guard**: `ThrottlerGuard` được gắn qua `APP_GUARD`.
- **Middleware**:
  - `CorrelationIdMiddleware` chạy global (gắn request id).
  - `loggerMiddleware` được apply có chọn lọc (ví dụ chỉ cho `ProductController`).

## 3) Configuration & env validation (Zod)

- Dùng Zod để validate env tại startup (`src/config/env.validation.ts`).
- “Optional in dev” cho các tích hợp không bắt buộc (vd `STRIPE_*`, `CLOUDINARY_*`, `RESEND_*`, `OPENAI_*`).
- **Fail fast**: env sai sẽ throw error khi bootstrap.

Pattern khuyến nghị khi dùng:

- Service/module đọc config qua `EnvService` (hoặc `ConfigService`), hạn chế `process.env` trực tiếp trong service.

## 4) HTTP response envelope (Interceptor)

Có interceptor chuẩn hóa response thành envelope thống nhất:

- `statusCode`, `status`, `timestamp`, `data`, `message`

Điều này giúp FE consume ổn định và giúp logging/monitoring dễ hơn.

## 5) Error handling (Global Exception Filter)

- Có global filter normalize lỗi (`HttpExceptionFilter`).
- **5xx log error** (kèm stack), **4xx log warn**.
- Có **requestId** lấy từ header correlation-id để trace.

Guideline:

- Controller/service nên throw `BadRequestException`, `NotFoundException`, … thay vì trả object lỗi tùy ý.

## 6) Logging (nestjs-pino)

Pattern đang dùng trong `AppModule`:

- **Pino HTTP logger** (async-friendly).
- **Redact** headers nhạy cảm (Authorization/Cookie/x-api-key).
- Serializer “trim” payload request/response (đỡ noisy).
- Dev dùng `pino-pretty` transport (chỉ `NODE_ENV=development` để tránh crash trong Docker/prod).

## 7) MongoDB + Mongoose patterns

- Mongoose connect via `MongooseModule.forRootAsync` + `EnvService`.
- “Bootstrap observability”: log events `connected/error` để debug khi treo kết nối.
- **Repository pattern**:
  - Query trả về JSON dùng `.lean().exec()` để giảm overhead.
  - List endpoints dùng `skip/limit/sort` + `countDocuments` theo chuẩn pagination.
  - Xử lý race duplicate key (err code `11000`) theo business expectation (vd toggle favorite).

Checklist:

- Reads: ưu tiên `.lean()` (đặc biệt khi trả JSON API).
- Indexes: đặt trong schema (unique/partial khi cần).
- Không để controllers/services tự viết query Mongoose trực tiếp (trừ trường hợp rất đặc biệt).

## 8) Validation (DTO + ValidationPipe)

- Global `ValidationPipe` bật: `whitelist: true`, `transform: true`.
- DTO theo use-case (create/update/query) + class-validator.

Checklist:

- Query params numeric dùng `@Type(() => Number)` + validators.
- Không nhận “object tùy ý” rồi tự parse trong controller.

## 9) Auth / Guards / Throttling

- JWT (Passport) được cấu hình global qua `JwtModule.registerAsync`.
- Throttling theo named config:
  - `default`: limit 60/min
  - `auth`: limit 10/min
- Guards dùng ở controller/method (`@UseGuards(JwtAuthGuard)`).

## 10) Payments (Stripe) — webhook-first state machine

Pattern chính:

- **Create PaymentIntent** → persist record `payments` với `status=PENDING`.
- **Finalize state** (SUCCEEDED/FAILED) qua **Stripe webhook**:
  - Endpoint: `POST /payments/webhook/stripe`
  - raw body middleware gắn riêng cho route đó để verify signature.

Checklist bắt buộc khi vận hành:

- Stripe dashboard/CLI phải forward webhook đến đúng environment.
- `STRIPE_WEBHOOK_SECRET` phải đúng để `constructEvent` không fail.
- (Khuyến nghị) idempotency cho webhook: dedupe theo `event.id` để tránh xử lý double (Stripe retry).

## 11) Idempotency (HTTP)

- Có `IdempotencyModule/IdempotencyService` được dùng ở những endpoint tạo intent (vd payment create-intent).
- Pattern: bắt buộc header `Idempotency-Key` và execute “exactly-once semantics” theo user + route.

## 12) Background jobs / scheduled tasks

- `@nestjs/schedule` được bật trong `AppModule`.
- Có các services dạng expire/reconcile/cleanup (vd booking/payment/tour-booking/review cleanup) → thường là cron hoặc worker style.

Guideline:

- Work nặng/async side-effect (email, fan-out notify, heavy processing) nên đẩy sang queue.

## 13) Event-driven (Nest EventEmitter + Notification/Socket)

- `EventEmitterModule.forRoot()` bật global.
- Pattern thường dùng: service emit domain events → notification/socket listener/processor xử lý fan-out.

## 14) API docs (Swagger)

- Swagger enable ở môi trường không production (`/api`).
- Controller dùng decorators (`@ApiTags`, `@ApiOperation`, `@ApiResponse`, …).

## 15) Deployment/runtime patterns (từ README)

- Docker/Compose dùng cho local + VPS deploy.
- CI/CD GitLab pipeline (validate/test/build/deploy) theo branch staging/production.
- Mongo/Redis chạy trong compose, giữ volumes qua deploy (chỉ recreate backend container).

---

## “Golden rules” (tóm gọn)

- **Không fat controller**: controller chỉ xử lý HTTP + delegate.
- **Mongoose chỉ trong repository**: service gọi repository.
- **Đọc dùng `.lean()`** (trừ khi cần document features).
- **Env validate fail-fast** bằng Zod.
- **Webhook-first** cho Stripe: DB state đổi khi webhook tới.
- **Logging có redact + requestId** để trace production.
- **Idempotency** cho endpoint tạo side-effect.
