# Internal Quality Improvements

Tài liệu ghi lại toàn bộ những cải thiện "vòng trong" đã thực hiện, bao gồm 4 phase: Unit Tests, Logging & Observability, Security Hardening, Config & Env Validation.

---

## Tổng quan

```
Phase 1  →  Unit Tests          (auth, booking, payment, idempotency)
Phase 2  →  Logging             (nestjs-pino, correlation ID, health endpoint)
Phase 3  →  Security            (helmet, throttler, CORS, cookie, statusCode fix)
Phase 4  →  Config/Env          (Zod schema, type-safe EnvService, cleanup)
```

---

## Phase 1 — Unit Tests

### Mục tiêu

Không test CRUD trivial. Tập trung vào **business logic có rủi ro cao** ở 4 module quan trọng nhất.

### Files đã thay đổi

| File | Số test | Nội dung chính |
|------|---------|----------------|
| `src/auth/auth.service.spec.ts` | 13 | validateUser, register (conflict/mismatch), login, refresh (rotate/expired/not found), logout, logoutAll |
| `src/booking/booking.service.spec.ts` | 26 | Tính tiền (đêm × giá), extra adults/children, applySale (percent/expired), availability, cancel (owner/admin/paid/inventory rollback), markAsPaid/Failed/Refunded, update |
| `src/payment/payment.service.spec.ts` | 15 | createPaymentIntent (invalid/expired/paid), webhook handler (succeeded/failed/tourBooking/unknown), refund (partial/full/exceeded) |
| `src/idempotency/idempotency.service.spec.ts` | 5 | Cached result (COMPLETED), PROCESSING conflict, new key flow, separate keys, handler error propagation |

**Tổng: 61 tests, tất cả pass.**

### Thay đổi Jest config (`package.json`)

```jsonc
"jest": {
  // Cho phép transform uuid (ESM package)
  "transformIgnorePatterns": ["node_modules/(?!(uuid)/)"],
  // Alias src/ → rootDir/
  "moduleNameMapper": { "^src/(.*)$": "<rootDir>/$1" }
}
```

### Pattern mock chuẩn

```typescript
// Không dùng DB thật — mock toàn bộ Model và dependencies
const module = await Test.createTestingModule({
  providers: [
    BookingService,
    { provide: getModelToken(Booking.name), useValue: mockBookingModel },
    { provide: RoomInventoryService, useValue: mockRoomInventoryService },
  ],
}).compile();
```

---

## Phase 2 — Logging & Observability

### Vấn đề cũ

- `HttpExceptionFilter` log toàn bộ `headers` + `body` mọi lỗi → lộ token/password
- `logger.middleware.ts` có `console.log('middleware running')` (dev artifact), chỉ gắn cho `ProductController`
- Không có correlation ID để trace một request xuyên suốt

### Packages cài thêm

```
nestjs-pino      pino-http      pino-pretty (devDep)
```

### Kiến trúc mới

```
Request
  → CorrelationIdMiddleware   (sinh requestId, gắn x-request-id header)
  → LoggerModule (pino-http)  (auto log method, url, status, ms)
  → Controller / Service      (Logger.log / .warn / .error với structured JSON)
```

### Files thay đổi / tạo mới

**Tạo mới `src/common/middleware/correlation-id.middleware.ts`**
- Sinh `requestId` (uuid) mỗi request
- Gắn vào request object và response header `X-Request-Id`
- Nếu client đã gửi `x-request-id`, giữ nguyên (hỗ trợ distributed tracing)

**Tạo mới `src/health/health.controller.ts` + `HealthModule`**
- `GET /health` → `{ status: "ok", uptime, timestamp }`
- Dùng cho load balancer ping, monitoring

**Sửa `src/interceptor/http-fail.interceptor.filter.ts`**
- Xóa `console.log(request.headers, request.body)`
- Dùng NestJS `Logger` thay `console.*`
- Log `warn` cho 4xx, log `error` cho 5xx
- Chỉ log `{ requestId, method, url, status, message, stack? }`

**Sửa `src/middleware/logger.middleware.ts`**
- Xóa `console.log('middleware running')`
- Đổi tên export: `loggerMiddleware` (từ `logger`)
- Dùng NestJS `Logger` thay `console.log`

**Sửa `src/app.module.ts`**
- Import `LoggerModule.forRootAsync`
- Cấu hình: `pino-pretty` khi dev, JSON khi production
- Redact `req.headers.authorization` và `req.headers.cookie`
- Gắn `CorrelationIdMiddleware` cho tất cả route (`forRoutes('*')`)
- Xóa duplicate `ConfigModule.forRoot` trong `SharedModule`

---

## Phase 3 — Security & HTTP Hardening

### Vấn đề cũ

- CORS hardcode 3 localhost ports, không phân biệt môi trường
- Không có security headers (XSS, clickjacking, MIME sniffing...)
- Không có rate limiting
- Cookie refresh token thiếu `secure`, `sameSite`, `path` rõ ràng
- `ResponseTransformInterceptor` hardcode `statusCode: 200` trong response body
- `HttpExceptionFilter` gắn cả global lẫn local ở 3 controllers (redundant)

### Packages cài thêm

```
helmet      @nestjs/throttler
```

### Files thay đổi

**Sửa `src/main.ts`**
- Thêm `app.use(helmet())` — security headers tự động
- CORS đọc từ env `CORS_ORIGINS` (comma-separated), fallback về localhost
- Dùng pino Logger: `app.useLogger(app.get(Logger))`
- Swagger chỉ khởi tạo khi không phải production

**Sửa `src/app.module.ts`**
- Thêm `ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 60 }])`
- Gắn `ThrottlerGuard` global qua `APP_GUARD`

**Sửa `src/auth/auth.controller.ts`**
- Inject `ConfigService` để lấy `NODE_ENV`
- Cookie options theo môi trường:
  ```typescript
  secure: isProduction,
  sameSite: isProduction ? 'strict' : 'lax',
  path: '/api/v1/auth',   // giới hạn scope
  httpOnly: true,
  ```
- Gắn `@Throttle({ auth: { ttl: 60_000, limit: 10 } })` cho `POST /login`

**Sửa `src/interceptor/http-success.interceptor.filter.ts`**
- Lấy status code thực từ response thay vì hardcode `200`:
  ```typescript
  const response = context.switchToHttp().getResponse();
  return next.handle().pipe(map(data => ({ statusCode: response.statusCode, ... })));
  ```

**Sửa `src/provinces/provinces.controller.ts`, `tour-guide.controller.ts`, `user.controller.ts`**
- Xóa `@UseFilters(new HttpExceptionFilter())` redundant (đã có global)
- Xóa import không dùng

**Sửa `src/health/health.controller.ts`**
- Gắn `@SkipThrottle()` — không rate limit health check

**Sửa `src/payment/payment.controller.ts`**
- Gắn `@SkipThrottle()` cho `POST webhook/stripe` — Stripe gọi webhook không nên bị chặn

---

## Phase 4 — Config & Env Validation

### Vấn đề cũ

- `ConfigModule.forRoot({ isGlobal: true })` khai báo **2 lần**: `AppModule` + `SharedModule`
- Không validate env: thiếu `JWT_SECRET`, `DB_URI` → app vẫn start, chỉ fail khi runtime

### Files thay đổi / tạo mới

**Tạo mới `src/config/env.validation.ts`**

```typescript
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(9001),
  DB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(8),
  JWT_REFRESH_SECRET: z.string().min(8),
  JWT_REFRESH_TTL: z.string().default('7d'),
  JWT_ISSUER: z.string().default('vn-tours'),
  JWT_AUDIENCE: z.string().default('vn-tours-clients'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CORS_ORIGINS: z.string().default('http://localhost:5173,...'),
});

export type EnvConfig = z.infer<typeof envSchema>;
export function validateEnv(config): EnvConfig { ... }
```

**Sửa `src/app.module.ts`**
- Gắn `validate: validateEnv` vào `ConfigModule.forRoot`
- App sẽ **crash ngay lúc startup** với message rõ ràng nếu thiếu/sai env

**Sửa `src/shared/shared.module.ts`**
- Xóa `ConfigModule.forRoot({ isGlobal: true })` duplicate
- Chỉ giữ `providers: [EnvService], exports: [EnvService]`

**Sửa `src/env/env.service.ts`**
- Type-safe với `ConfigService<EnvConfig, true>`
- Generic `get<K extends keyof EnvConfig>(key: K): EnvConfig[K]`

---

## Tổng kết các file thay đổi

### Tạo mới

```
src/auth/auth.service.spec.ts              (13 tests)
src/booking/booking.service.spec.ts        (26 tests)
src/payment/payment.service.spec.ts        (15 tests)
src/idempotency/idempotency.service.spec.ts (5 tests)
src/common/middleware/correlation-id.middleware.ts
src/health/health.controller.ts
src/health/health.module.ts
src/config/env.validation.ts
```

### Sửa đổi

```
package.json                                (jest config)
src/main.ts                                 (helmet, CORS từ env, pino logger)
src/app.module.ts                           (ThrottlerModule, LoggerModule, validateEnv)
src/shared/shared.module.ts                 (xóa duplicate ConfigModule)
src/env/env.service.ts                      (type-safe)
src/interceptor/http-fail.interceptor.filter.ts   (bỏ sensitive log)
src/interceptor/http-success.interceptor.filter.ts (fix statusCode)
src/middleware/logger.middleware.ts          (NestJS Logger, bỏ dev artifact)
src/auth/auth.controller.ts                 (cookie security, throttle)
src/provinces/provinces.controller.ts       (xóa duplicate filter)
src/tour-guide/tour-guide.controller.ts     (xóa duplicate filter)
src/user/user.controller.ts                 (xóa duplicate filter)
src/payment/payment.controller.ts           (SkipThrottle cho webhook)
src/health/health.controller.ts             (SkipThrottle)
```

---

## Bước tiếp theo (chưa implement)

Sau khi hoàn thành 4 phase này, những việc cần làm tiếp để dự án vững hơn:

### Feature mới
- **Mail module**: xác nhận booking, reset password, notify hủy/refund
- **OTP module**: login 2FA, verify email/phone (Redis TTL)
- **Queue booking**: Bull + Redis, xử lý booking async, retry, DLQ
- **Background jobs**: hủy booking pending quá hạn, trả inventory

### Infrastructure
- **Docker + docker-compose**: app + MongoDB (+ Redis khi thêm queue)
- **CI pipeline**: GitHub Actions — lint + test trên mỗi PR

### Database robustness
- Xem xét MongoDB transactions cho flow booking + inventory + payment
- Đảm bảo invariant: CONFIRMED ↔ inventory reserved, CANCELLED ↔ inventory trả lại
