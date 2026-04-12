# MongoDB trên VPS (staging) — những việc đã làm

Tài liệu này mô tả ngắn gọn cấu hình MongoDB cho môi trường **staging** trên Docker và cách **đưa dữ liệu** (restore) từ bản dump local.

---

## 1. Mongo chạy như thế nào trên staging

- Mongo nằm trong container Docker (ví dụ tên: `backend-staging-mongo`), cùng network với backend (`travel-vn-dev-network` trong `docker-compose.staging.yml`).
- Ứng dụng NestJS kết nối qua biến **`DB_URI`** trong file `.env` trên VPS (thư mục deploy, ví dụ `/opt/travel-be/staging/.env`).

---

## 2. `DB_URI` phải dùng hostname `mongo`, không dùng `localhost`

Trong container backend, **`localhost` là chính container backend**, không phải Mongo.

- **Sai (ví dụ):** `mongodb://127.0.0.1:27017/travel-vn` — app không tới được Mongo trong stack Docker.
- **Đúng:** `mongodb://mongo:27017/travel-vn` — `mongo` là **tên service** trong `docker-compose.staging.yml`.

Phần **tên database** sau host (ở đây `travel-vn`) phải **trùng** với database bạn restore và với cấu hình ứng dụng.

---

## 3. Dữ liệu nguồn: thư mục dump `e-commerce`

- Dữ liệu được export dạng **`mongodump`**: mỗi collection một cặp file **`.bson`** + **`.metadata.json`** (ví dụ `user.bson`, `hotels.bson`, …).
- Thư mục này có thể đặt tên tùy ý; trong quá trình làm việc đã dùng tên **`e-commerce`** chứa các file đó.

---

## 4. Các bước restore lên Mongo trên VPS

### 4.1. Copy thư mục dump lên server

Từ máy local (ví dụ `scp`):

```bash
scp -r e-commerce user@VPS_IP:/opt/travel-be/staging/
```

### 4.2. Đưa dump vào container Mongo và chạy `mongorestore`

```bash
docker cp /opt/travel-be/staging/e-commerce backend-staging-mongo:/tmp/e-commerce

docker exec backend-staging-mongo mongorestore \
  --drop \
  --db=travel-vn \
  /tmp/e-commerce
```

- **`--db=travel-vn`:** phải **trùng** tên database trong `DB_URI` (ví dụ `mongodb://mongo:27017/travel-vn`).
- **`--drop`:** xóa collection trùng tên trước khi import (tránh trùng `_id`). Nếu chỉ muốn bổ sung dữ liệu và chấp nhận rủi ro trùng khóa, có thể bỏ `--drop` (cần hiểu rõ hậu quả).

### 4.3. Khởi động lại backend (khuyến nghị)

```bash
cd /opt/travel-be/staging
docker compose -f docker-compose.staging.yml restart backend-staging
```

---

## 5. Kiểm tra sau khi restore

Liệt kê collection trong database `travel-vn`:

```bash
docker exec backend-staging-mongo mongosh travel-vn --eval 'db.getCollectionNames()'
```

Kỳ vọng thấy các collection tương ứng với dump (ví dụ `user`, `hotels`, `tours`, …).

---

## 6. Kết nối MongoDB Compass từ máy local (qua SSH tunnel)

Mongo trên VPS chỉ nên lộ cổng trên **loopback** (`127.0.0.1`), không public Internet. Trong `docker-compose.staging.yml`, service `mongo` cần có map port dạng `127.0.0.1:27017:27017` để tunnel SSH có chỗ nối vào.

### 6.1. Mở tunnel SSH (giữ terminal mở khi dùng Compass)

Trên máy local:

```bash
ssh -N -L 27017:127.0.0.1:27017 user@VPS_IP
```

- `27017` bên trái là port trên **máy bạn** (Compass trỏ vào đây). Nếu port đó đã bận (ví dụ Mongo local), đổi thành `27018` và dùng cùng số đó trong Compass.
- `127.0.0.1:27017` bên phải là Mongo trên **VPS** (sau khi đã map trong compose).

### 6.2. Chuỗi kết nối trong Compass

Sau khi tunnel đã chạy, trong Compass dùng host **`127.0.0.1`** (hoặc `localhost`) và port đã chọn ở bước tunnel (mặc định `27017`).

Nếu Mongo đã bật **authentication** (user tạo trong `admin`, ví dụ role `root`):

- **Connection string (URI):**

  `mongodb://USER:PASSWORD@127.0.0.1:27017/travel-vn?authSource=admin`

  Thay `USER`, `PASSWORD` bằng user/pass thật; **`travel-vn`** là tên database ứng dụng (khớp `DB_URI`).

- **Ký tự đặc biệt trong mật khẩu** (ví dụ `@`): phải **URL-encode** trong URI (`@` → `%40`). Hoặc nhập User / Password / Authentication Database (`admin`) trong form của Compass thay vì gõ hết vào một URI.

**Lưu ý:** Trong `.env` trên VPS, backend vẫn dùng `DB_URI` với hostname **`mongo`** (tên service Docker). Chỉ khi kết nối **từ Compass qua tunnel** thì host là **`127.0.0.1`** trên máy local.

### 6.3. Hai Mongo trên cùng một VPS

Nếu staging và production cùng máy và cả hai đều map `27017`, sẽ xung đột. Một stack nên dùng port host khác (ví dụ `127.0.0.1:27018:27017`) và tunnel trỏ đúng port đó: `-L 27017:127.0.0.1:27018`.

---

## 7. Liên hệ với đăng nhập ứng dụng

- User đăng nhập lấy từ collection (ví dụ `user`) trong database đã restore.
- Sau khi `DB_URI` đúng và dữ liệu đã import, luồng login qua API (ví dụ `POST /api/v1/auth/login`) sẽ hoạt động nếu Nginx đã proxy `/api/` tới đúng port backend và user/mật khẩu hợp lệ trong DB.

---

## 8. Ghi chú nhanh

| Mục | Giá trị / lưu ý |
|-----|------------------|
| Container Mongo (staging) | `backend-staging-mongo` (theo compose hiện tại) |
| Tên DB | `travel-vn` (khớp với `DB_URI`) |
| Hostname trong URI (backend) | `mongo` (tên service Docker) |
| Compass qua SSH tunnel | Host `127.0.0.1`, tunnel `ssh -L 27017:127.0.0.1:27017`, `?authSource=admin` nếu có auth |
| Công cụ restore | `mongorestore` (trong image `mongo:7.0`) |

---

*Tài liệu mô tả quy trình đã áp dụng cho staging; production có thể dùng container/tên DB/port khác — luôn đối chiếu `docker-compose.production.yml` và `.env` production.*
