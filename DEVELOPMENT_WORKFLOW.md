# Development Workflow — Travel VN Backend

## Mục lục

1. [Lấy data từ Staging về Local](#1-lấy-data-từ-staging-về-local)
2. [Code Flow (Git Branch Strategy)](#2-code-flow-git-branch-strategy)
3. [Migration Flow (Thay đổi Schema MongoDB)](#3-migration-flow-thay-đổi-schema-mongodb)
4. [Grafana + Prometheus monitoring](#4-grafana--prometheus-monitoring)

---

## 1. Lấy data từ Staging về Local

### Yêu cầu
- Đã có container local đang chạy (`docker compose -f docker-compose.local.yml up -d`)
- Có SSH access vào VPS staging

### Bước thực hiện

```bash
# 1. Dump data từ staging (chạy trên máy local)
ssh user@<VPS_IP> \
  "docker exec backend-staging-mongo mongodump --archive --db travel-vn" \
  > staging_dump.archive

# 2. Restore vào container local
docker exec -i backend-local-mongo mongorestore \
  --archive \
  --db travel-vn \
  --drop \
  < staging_dump.archive

# 3. Kiểm tra
docker exec backend-local-mongo mongosh \
  --eval "use travel-vn; db.stats()"
```

> **`--drop`**: Xóa collection cũ trước khi restore để tránh duplicate data.  
> Bỏ flag này nếu chỉ muốn merge thêm data.

### Khi nào cần chạy lại?
- Lần đầu setup môi trường local
- Staging có data mới hoặc schema thay đổi
- Container local bị xóa volume

---

## 2. Code Flow (Git Branch Strategy)

### Sơ đồ

```
production
    │
    ├──► checkout feature/xxx
    │         │
    │         │  (dev + test local)
    │         │
    │         ▼
    │       staging  ──► CI/CD deploy ──► test trên staging
    │         │
    │         │  (test OK)
    │         │
    └─────────▼
          production  ──► CI/CD deploy ──► live
```

### Các bước chi tiết

#### Bắt đầu tính năng mới

```bash
# Luôn checkout từ production (code ổn định nhất)
git checkout production
git pull origin production
git checkout -b feature/ten-tinh-nang
```

#### Dev và test local

```bash
# Chạy local
docker compose -f docker-compose.local.yml up -d

# Dev bình thường, commit thường xuyên
git add .
git commit -m "feat: mô tả tính năng"
```

#### Deploy lên Staging để test

```bash
git checkout staging
git pull origin staging
git merge feature/ten-tinh-nang
git push origin staging
# → GitLab CI/CD tự động build + deploy lên staging
```

#### Sau khi test staging OK → lên Production

```bash
git checkout production
git pull origin production
git merge staging
git push origin production
# → GitLab CI/CD tự động build + deploy lên production
```

#### Dọn dẹp branch

```bash
git branch -d feature/ten-tinh-nang
git push origin --delete feature/ten-tinh-nang
```

### Quy tắc đặt tên branch

| Loại | Pattern | Ví dụ |
|------|---------|-------|
| Tính năng mới | `feature/ten-tinh-nang` | `feature/booking-flow` |
| Sửa bug | `fix/mo-ta-bug` | `fix/payment-timeout` |
| Hotfix production | `hotfix/mo-ta` | `hotfix/login-error` |
| Cải tiến | `refactor/mo-ta` | `refactor/auth-module` |

### Hotfix (bug khẩn cấp trên production)

```bash
# Checkout từ production
git checkout production
git checkout -b hotfix/mo-ta-loi

# Fix xong → merge thẳng vào production
git checkout production
git merge hotfix/mo-ta-loi
git push origin production

# Đồng bộ lại staging
git checkout staging
git merge production
git push origin staging
```

---

## 3. Migration Flow (Thay đổi Schema MongoDB)

### Setup migrate-mongo (chỉ làm một lần)

```bash
# Cài đặt
yarn add migrate-mongo

# Khởi tạo config
yarn run migrate-mongo init
```

Cấu hình `migrate-mongo-config.js`:

```javascript
module.exports = {
  mongodb: {
    url: process.env.DB_URI,
    options: { useNewUrlParser: true }
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'migrations_changelog',
  migrationFileExtension: '.js'
}
```

### Tạo file migration mới

```bash
yarn run migrate-mongo create ten-migration
# Tạo ra: migrations/20240101000000-ten-migration.js
```

Cấu trúc file migration:

```javascript
// migrations/20240101000000-add-field-to-hotels.js
module.exports = {
  async up(db) {
    // Thay đổi schema ở đây
    await db.collection('hotels').updateMany(
      { newField: { $exists: false } },
      { $set: { newField: null } }
    );
  },

  async down(db) {
    // Rollback nếu cần
    await db.collection('hotels').updateMany(
      {},
      { $unset: { newField: '' } }
    );
  }
};
```

### Chạy migration

```bash
# Xem trạng thái migration
yarn run migrate-mongo status

# Chạy tất cả migration chưa chạy
yarn run migrate-mongo up

# Rollback migration gần nhất
yarn run migrate-mongo down
```

### Tích hợp vào CI/CD (`.gitlab-ci.yml`)

Thêm job `migrate` vào stage `deploy`, chạy **trước** khi restart container:

```yaml
deploy:staging:
  script:
    - cp "$CI_PROJECT_DIR/docker-compose.staging.yml" /opt/travel-be/staging/
    - cd /opt/travel-be/staging
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - export IMAGE_TAG=staging

    - docker compose -f docker-compose.staging.yml pull backend-staging
    - docker compose -f docker-compose.staging.yml up -d mongo redis

    # Chạy migration trước khi deploy backend mới
    - docker run --rm \
        --network travel-vn-dev-network \
        --env-file .env \
        $CI_REGISTRY_IMAGE:staging \
        yarn run migrate-mongo up

    - docker compose -f docker-compose.staging.yml up -d --no-deps --force-recreate backend-staging
    # ... health check ...
```

### Flow migration đầy đủ

```
1. Tạo file migration trên branch feature
   └── migrations/xxx-ten-thay-doi.js

2. Test migration trên local
   └── yarn run migrate-mongo up
   └── Kiểm tra data
   └── yarn run migrate-mongo down (test rollback)
   └── yarn run migrate-mongo up (chạy lại)

3. Merge vào staging
   └── CI/CD chạy migration tự động trước khi deploy

4. Kiểm tra staging OK

5. Merge vào production
   └── CI/CD chạy migration tự động trước khi deploy
```

> **Quan trọng:**  
> - Mỗi file migration chỉ chạy **một lần duy nhất** (được track trong collection `migrations_changelog`)  
> - Luôn viết hàm `down()` để có thể rollback khi cần  
> - Không bao giờ sửa file migration đã được deploy lên production

---

## 4. Grafana + Prometheus monitoring

Tài liệu đầy đủ (local / staging / production, biến môi trường, bảo mật): **[docs/MONITORING-GRAFANA.md](./docs/MONITORING-GRAFANA.md)**.

Tóm tắt nhanh:

```bash
# Local: stack DB + Prometheus/Grafana (API chạy trên host yarn start:dev :9001)
docker compose -f docker-compose.yml -f docker-compose.monitoring.local.yml up -d

# Staging / production: thêm overlay monitoring cùng compose hiện có
docker compose -f docker-compose.staging.yml -f docker-compose.monitoring.staging.yml up -d
docker compose -f docker-compose.production.yml -f docker-compose.monitoring.production.yml up -d
```

Biến Grafana xem trong [.env.docker.example](./.env.docker.example) (`MONITORING_*`).
