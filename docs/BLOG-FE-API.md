# Blog API — hướng dẫn tích hợp FE

Tất cả path prefix: **`/api/v1`**. Ảnh tải trước qua `POST /api/v1/media/upload` (xem tài liệu media nếu có), sau đó gắn `url` / `public_id` vào DTO (thumbnail, gallery, category thumbnail…).

**Auth (Admin):** `Authorization: Bearer <accessToken>`, user có `roles` chứa `admin`.

---

## FE Client (công khai)

### Categories

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/blog-categories` | Danh sách (query: `page`, `limit`, `search`, public chỉ thấy `isActive: true` qua dữ liệu) |
| GET | `/blog-categories/:slug` | Chi tiết category theo `slug` |

### Tags

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/blog-tags` | Danh sách tag (query: `page`, `limit`, `search`) |

### Bài viết

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/blog-posts` | Danh sách bài **đã publish** — query: `page`, `limit`, `search`, `category` (slug), `tag` (slug), `province` (slug tỉnh), `sort` = `latest` \| `popular` \| `oldest`, `lang` (ưu tiên giao diện) |
| GET | `/blog-posts/featured?limit=6` | Bài nổi bật |
| GET | `/blog-posts/:slug` | Chi tiết bài (tự **tăng** `viewCount` mỗi lần gọi) |
| GET | `/blog-posts/:slug/related` | Bài gợi ý theo cùng category / tag / province (giới hạn 5) |

**Reserved slug (không dùng làm slug bài):** `admin`, `featured`.

Nội dung bài: `translations[lang].content` là mảng **Editor.js** blocks. `tableOfContents` & `readingTime` do BE tính lại khi tạo/cập nhật.

---

## FE Admin (JWT admin)

### Categories

| Method | Path | Body |
|--------|------|------|
| POST | `/blog-categories` | `name` { vi, en,… }, `slug?`, `description?`, `thumbnail?`, `order?`, `isActive?`, `translations?` (SEO) |
| PATCH | `/blog-categories/:id` | Partial |
| DELETE | `/blog-categories/:id` | Soft delete (`isDeleted`, `isActive: false`) |

### Tags

| Method | Path | Body |
|--------|------|------|
| POST | `/blog-tags` | `name` {…}, `slug?`, `isActive?` |
| PATCH | `/blog-tags/:id` | Partial |
| DELETE | `/blog-tags/:id` | Soft delete |

### Bài viết

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/blog-posts/admin` | Tất cả bài (kể cả draft) — query: `page`, `limit`, `search`, `status` = `draft` \| `published` |
| GET | `/blog-posts/admin/:id` | Chi tiết theo Mongo `_id` (form chỉnh sửa) |
| POST | `/blog-posts` | Tạo bài. `author` = user đăng nhập. `status` mặc định `draft` |
| PATCH | `/blog-posts/:id` | Cập nhật. Xóa category: gửi `category: null` hoặc `""` (theo cấu hình JSON) — BE chấp nhận clear bằng cách tương ứng trong service |
| PATCH | `/blog-posts/:id/publish` | Publish (set `publishedAt` nếu chưa có) |
| PATCH | `/blog-posts/:id/unpublish` | Về `draft` |
| DELETE | `/blog-posts/:id` | Soft delete |

**Payload tạo/sửa bài (gợi ý):**

- `category`: Mongo `ObjectId` string (bắt buộc theo dữ liệu category đã tạo).
- `tags`: mảng ObjectId.
- `relatedProvinces` / `relatedTours` / `relatedHotels`: mảng ObjectId tương ứng entity có trong DB.
- `translations[lang]`: `title`, `excerpt`, `content` = mảng block Editor.js, `seo?`.

---

## Ghi chú

- `postCount` trên category/tag là **bài đã published**; điều chỉnh khi publish / unpublish / xóa / đổi category‑tags.
- Tìm text trên public list: regex trên `translations.*.title` theo mã ngôn ngữ đang cấu hình trong bảng `Language`.
