# Tổng quan tech stack — nestjs-tours API

Tài liệu mô tả các công nghệ và thư viện chính mà dự án **nestjs-tours** (package `nest-api`) đang sử dụng, căn cứ `package.json`, Docker và cấu hình hiện tại.

---

## Runtime & ngôn ngữ

| Thành phần | Phiên bản / ghi chú |
|------------|---------------------|
| **Node.js** | 20 (Alpine trong Docker; xem `Dockerfile`) |
| **TypeScript** | ^5.7 — target ES2023, module CommonJS |
| **Package manager** | **Yarn** (`yarn.lock`, `yarn install` trong Docker) |

---

## Framework & HTTP

| Thành phần | Vai trò |
|------------|---------|
| **NestJS** (^11) | Framework chính: modules, DI, lifecycle |
| **@nestjs/platform-express** | Adapter HTTP trên Express |
| **helmet** | Header bảo mật HTTP |
| **cookie-parser** | Parse cookie |
| **@nestjs/throttler** | Giới hạn tần suất request |

---

## Cơ sở dữ liệu & cache

| Thành phần | Vai trò |
|------------|---------|
| **MongoDB** | CSDL chính (Docker: `mongo:7`) |
| **Mongoose** (^8) + **@nestjs/mongoose** | ODM & tích hợp Nest |
| **Redis** | Cache / hàng đợi (Docker: `redis:7-alpine`) |
| **ioredis** | Client Redis cho Node |

---

## Hàng đợi & tác vụ nền

| Thành phần | Vai trò |
|------------|---------|
| **BullMQ** (^5) + **@nestjs/bullmq** | Job queue trên Redis |
| **@nestjs/schedule** | Cron / lập lịch tác vụ |

---

## Realtime & sự kiện

| Thành phần | Vai trò |
|------------|---------|
| **Socket.IO** (qua `@nestjs/platform-socket.io`, `@nestjs/websockets`) | WebSocket / realtime |
| **@nestjs/event-emitter** | Event nội bộ trong process |

---

## Xác thực & bảo mật

| Thành phần | Vai trò |
|------------|---------|
| **@nestjs/jwt** + **passport** + **passport-jwt** + **@nestjs/passport** | JWT / chiến lược Passport |
| **bcryptjs** | Băm mật khẩu |

---

## API & validation

| Thành phần | Vai trò |
|------------|---------|
| **@nestjs/swagger** | OpenAPI / Swagger UI |
| **class-validator** + **class-transformer** | DTO validation & transformation |
| **@nestjs/mapped-types** | `PartialType`, v.v. cho DTO |
| **zod** | Schema validation (bổ sung; ví dụ env trong `env.validation.ts`) |
| **@nestjs/config** | Cấu hình & biến môi trường |

---

## Upload & media

| Thành phần | Vai trò |
|------------|---------|
| **multer** | Upload multipart |
| **cloudinary** | Lưu trữ / biến đổi ảnh trên cloud |
| **streamifier** | Stream buffer ↔ stream (thường dùng với upload) |

---

## Thanh toán & gửi mail

| Thành phần | Vai trò |
|------------|---------|
| **stripe** | Thanh toán |
| **resend** | Gửi email qua API |

---

## AI

| Thành phần | Vai trò |
|------------|---------|
| **@tanstack/ai** + **@tanstack/ai-openai** | Tích hợp AI (OpenAI) theo stack TanStack AI |

---

## Logging

| Thành phần | Vai trò |
|------------|---------|
| **nestjs-pino** + **pino-http** | HTTP logging (Pino) |
| **pino-pretty** (dev) | Đọc log dễ hơn khi dev |

---

## Tiện ích

| Thành phần | Vai trò |
|------------|---------|
| **rxjs** | Reactive streams (chuẩn Nest) |
| **date-fns** | Xử lý ngày giờ |
| **uuid** | Định danh UUID |
| **reflect-metadata** | Metadata cho decorators |

---

## DevOps & triển khai

| Thành phần | Ghi chú |
|------------|---------|
| **Docker** | Multi-stage build: Node 20 Alpine, `yarn build`, chạy `node dist/src/main.js` |
| **Docker Compose** | Dịch vụ: `api`, `mongo`, `redis`; port API mặc định host **9001** → container 9001 |

---

## Chất lượng & kiểm thử

| Thành phần | Vai trò |
|------------|---------|
| **Jest** + **ts-jest** + **@nestjs/testing** | Unit test |
| **supertest** | Test HTTP / e2e |
| **ESLint** (^9) + **typescript-eslint** + **eslint-config-prettier** | Lint |
| **Prettier** | Format code |
| **@swc/core** / **@swc/cli** | Có trong devDependencies (build nhanh khi cấu hình SWC) |

---

## Tóm tắt kiến trúc dữ liệu & hạ tầng

```
Client / BFF
    → NestJS (Express) :9001
    → MongoDB (Mongoose)
    → Redis (cache + BullMQ)
    → Socket.IO (realtime)
    → Dịch vụ ngoài: Cloudinary, Stripe, Resend, OpenAI (qua TanStack AI)
```

---

*Cập nhật theo trạng thái repo; khi thêm/thay dependency, nên đồng bộ lại bảng trên.*
