# Database Workflow

Hướng dẫn sử dụng hệ thống database workflow cho local development.

---

## Yêu cầu

### MongoDB Database Tools

Cài trên macOS:

```bash
brew install mongodb-database-tools
```

Kiểm tra:

```bash
mongodump --version
mongorestore --version
```

### SSH Tunnel (cho staging commands)

Trước khi chạy `db:seed:from-staging` hoặc `db:pull:staging`, mở SSH tunnel:

```bash
ssh -N -L 27117:127.0.0.1:27017 user@VPS_IP
```

Port `27117` trên máy local map tới `27017` trên VPS (tránh xung đột với Mongo local).

---

## Biến môi trường

Thêm vào `.env`:

```env
# Database workflow scripts (NOT used by NestJS app)
MONGO_URI_LOCAL=mongodb://duongnv:Duong%4088999@localhost:27017/travel_vn_local?authSource=admin&authMechanism=SCRAM-SHA-256
MONGO_URI_STAGING=mongodb://USER:PASS@localhost:27117/travel-vn?authSource=admin
MONGO_DB_LOCAL=travel_vn_local
MONGO_DB_DEBUG=travel_vn_debug

# Local Mongo (Docker) auth (docker-compose.yml uses these)
MONGO_ROOT_USERNAME=duongnv
MONGO_ROOT_PASSWORD=Duong@88999
```

- `MONGO_URI_LOCAL`: kết nối MongoDB local từ host machine (dùng `localhost`, không phải `mongo`)
- `MONGO_URI_STAGING`: kết nối staging qua SSH tunnel (port `27117`)
- `DB_URI` trong `.env` (dùng bởi NestJS app) **không bị ảnh hưởng**

---

## Commands

### Migration

```bash
# Chạy tất cả pending migrations
yarn db:migrate

# Rollback migration gần nhất
yarn db:migrate:down

# Tạo migration mới (tên do developer đặt)
yarn db:migrate:create add-slug-to-hotels
yarn db:migrate:create create-email-index-on-users
yarn db:migrate:create backfill-cityId-for-hotels
```

Migration files nằm trong `migrations/` và được commit vào git.

### Seed từ staging snapshot (recommended daily mode)

```bash
yarn db:seed:from-staging
```

Flow:
1. Dump toàn bộ data từ staging (read-only qua SSH tunnel)
2. Restore vào local DB
3. Sanitize: thay email/phone/password trong collection `user`, xóa tokens/sessions
4. Chạy migrations
5. In summary số lượng documents mỗi collection

Dữ liệu user sau sanitize:
- Email: `user-1@demo.local`, `user-2@demo.local`, ...
- Phone: `0900000001`, `0900000002`, ...
- Password: `Demo@123` (cho tất cả users)

### Pull staging data (debug mode)

```bash
yarn db:pull:staging
```

Flow:
1. Dump từ staging (read-only)
2. Restore vào DB riêng: `travel_vn_debug` (không ghi đè DB chính)
3. Chạy migrations trên debug DB
4. In summary

Dùng khi cần debug lỗi thật trên staging — data KHÔNG được sanitize.

### Standard seed

```bash
yarn db:seed
```

Flow:
1. Drop local DB
2. Chạy migrations
3. Seed từ `seeds/realistic/` (nếu có) hoặc `seeds/base/`

### Reset database

```bash
yarn db:reset
```

Drop toàn bộ local DB. Yêu cầu xác nhận trước khi thực hiện.

---

## Cấu trúc thư mục

```text
scripts/database/
  lib/
    config.ts          # Load env, parse URI, constants
    logger.ts          # Colored terminal logs
    confirm.ts         # Interactive confirmation prompt
    mongo-tools.ts     # mongodump/mongorestore wrappers
  reset.ts             # yarn db:reset
  sanitize.ts          # Sanitize user data
  seed.ts              # yarn db:seed
  seed-from-staging.ts # yarn db:seed:from-staging
  pull-staging.ts      # yarn db:pull:staging

seeds/
  base/                # Seed data thủ công (committed)
  realistic/           # Tự động từ staging snapshot (gitignored)

backups/               # Staging dumps tạm (gitignored)

migrations/            # migrate-mongo files (committed)

migrate-mongo-config.js  # Config cho migrate-mongo
```

---

## Quy tắc an toàn

1. **Không bao giờ ghi lên staging** — chỉ dùng `mongodump` (read-only)
2. **Xác nhận trước khi xóa** — mọi script destructive đều hỏi confirm
3. **Debug DB riêng** — `db:pull:staging` restore vào `travel_vn_debug`, không động tới `travel_vn_local`
4. **Sanitize bắt buộc** — `db:seed:from-staging` luôn sanitize user data trước khi dùng
5. **Không commit secrets** — `backups/` và `seeds/realistic/` nằm trong `.gitignore`

---

## Ví dụ workflow hàng ngày

```bash
# 1. Bật Docker (Mongo + Redis)
docker compose up -d

# 2. Mở SSH tunnel tới staging
ssh -N -L 27117:127.0.0.1:27017 user@VPS_IP &

# 3. Seed local DB từ staging
yarn db:seed:from-staging

# 4. Chạy app
yarn start:dev
```

### Debug lỗi staging

```bash
# Pull raw staging data vào DB debug riêng
yarn db:pull:staging

# Đổi DB_URI tạm trong .env để trỏ vào debug DB, rồi restart app
# DB_URI=mongodb://duongnv:Duong%4088999@localhost:27017/travel_vn_debug?authSource=admin
```

### Tạo migration mới

```bash
# Tạo file migration
yarn db:migrate:create add-slug-to-hotels

# Sửa file migration trong migrations/
# Rồi chạy
yarn db:migrate
```
