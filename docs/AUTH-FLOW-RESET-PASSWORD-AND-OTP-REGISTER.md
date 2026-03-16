## Auth – Reset Password bằng Token & OTP cho Register

Tài liệu này mô tả các thay đổi để FE implement:

- **Reset password** chuyển sang dùng **token qua email** (không dùng OTP nữa).
- **OTP** được dùng cho các mục đích như **xác minh email khi đăng ký** (`VERIFY_EMAIL`), v.v.

---

## 1. Reset password bằng token

### 1.1. Tổng quan luồng

1. User bấm **"Quên mật khẩu"** trên FE.
2. FE gọi API `POST /api/v1/auth/forgot-password/request` với `identifier` (username, email hoặc số điện thoại).
3. BE:
   - Tìm user theo `username` / `email` / `phone`.
   - Nếu tìm thấy và user có `email`:
     - Sinh **JWT token** loại `reset-password` (hết hạn mặc định **15 phút**).
     - Gửi email chứa link reset password (token nằm trên URL) cho user.
4. User click link trong email → FE mở màn hình **đặt lại mật khẩu**, nhận `token` từ query string.
5. User nhập **mật khẩu mới**.
6. FE gọi API `POST /api/v1/auth/forgot-password/confirm` với `token` + `newPassword`.
7. BE:
   - Verify token (`valid`, chưa hết hạn, `typ === 'reset-password'`).
   - Hash mật khẩu mới và cập nhật vào DB.
   - Trả về message thành công, **không tự động login**.

### 1.2. API chi tiết

#### 1.2.1. Yêu cầu email reset password

- **Endpoint**: `POST /api/v1/auth/forgot-password/request`
- **Auth**: Public (không cần token)
- **Rate limiting**: Bucket `auth` (mặc định 10 request / phút / IP)

**Request body**

```json
{
  "identifier": "duong" // hoặc "user@example.com" hoặc "0987xxxxxx"
}
```

- **identifier**:
  - Có thể là `username`, `email` hoặc `phone` đã đăng ký.

**Response (200)**

```json
{
  "message": "Password reset email sent"
}
```

> FE nên hiển thị message trung tính kiểu:  
> “Nếu tài khoản tồn tại, chúng tôi đã gửi email hướng dẫn đặt lại mật khẩu.”

**Các lỗi có thể gặp (4xx)**

- `400 Bad Request`
  - `"User not found"` – không tìm thấy user theo `identifier`.
  - `"User does not have an email"` – user không có email để gửi link reset.

---

#### 1.2.2. Xác nhận token & đặt lại mật khẩu

- **Endpoint**: `POST /api/v1/auth/forgot-password/confirm`
- **Auth**: Public (không cần token)

**Request body**

```json
{
  "token": "<reset_password_token>",
  "newPassword": "NewStrongPass123!"
}
```

- **token**:
  - JWT do BE gửi qua email, type `reset-password`, có hạn sử dụng (15 phút).
  - FE lấy token từ query string của link email, ví dụ:
    - `https://fe-domain.com/forgot-password/confirm?token=...`
- **newPassword**:
  - Mật khẩu mới, tối thiểu 6 ký tự (rule có thể siết chặt thêm).

**Response (200)**

```json
{
  "message": "Password has been reset successfully"
}
```

- Sau khi thành công:
  - Mật khẩu của user trong DB đã được cập nhật (đã hash).
  - Token không còn giá trị (vì JWT đã hết hạn hoặc FE không dùng lại).
  - BE **không** trả về access/refresh token; FE nên chuyển user sang màn hình login.

**Các lỗi có thể gặp (4xx/401)**

- `400 Bad Request`
  - `"New password is too short"` – mật khẩu mới không đạt tối thiểu.
- `401 Unauthorized`
  - `"Invalid or expired reset token"` – token sai/hết hạn.
  - `"Invalid reset token"` – token không phải loại `reset-password` hoặc payload không hợp lệ.
  - `"User not found"` – user tương ứng với `sub` trong token không còn tồn tại.

---

### 1.3. Email template reset password (để FE tham khảo UX)

BE gửi email với nội dung dạng:

- Tiêu đề: **`[VN Tours] Đặt lại mật khẩu của bạn`**
- Nội dung chính:
  - Lời chào theo `username`.
  - Nút **"Đặt lại mật khẩu"** trỏ tới FE:
    - `FE_BASE_URL/forgot-password/confirm?token=<token>`
  - Đoạn text hiển thị full URL phòng trường hợp nút không bấm được.
  - Lưu ý: link hết hạn sau **15 phút**.

---

## 2. OTP cho Register / Verify Email

Hệ thống OTP hiện được dùng cho các `purpose` khác nhau, trong đó quan trọng với FE là:

- `VERIFY_EMAIL` – xác minh email khi đăng ký tài khoản.

OTP được quản lý qua Redis và queue notification như trước, chỉ thay đổi nội dung email.

### 2.1. API OTP generic (dùng chung)

#### 2.1.1. Gửi OTP

- **Endpoint**: `POST /api/v1/otp/send`
- **Auth**: Public

**Request body**

```json
{
  "purpose": "VERIFY_EMAIL",
  "target": "user@example.com",
  "meta": {
    // optional, tuỳ use-case
  }
}
```

- **purpose**:
  - Với luồng đăng ký: sử dụng `"VERIFY_EMAIL"`.
- **target**:
  - Email mà OTP sẽ được gửi tới (ví dụ `user@example.com`).
- **meta**:
  - Tuỳ ý, để BE lưu thêm context nếu cần (không bắt buộc).

**Response (200)**

```json
{
  "success": true
}
```

---

#### 2.1.2. Verify OTP

- **Endpoint**: `POST /api/v1/otp/verify`
- **Auth**: Public

**Request body**

```json
{
  "purpose": "VERIFY_EMAIL",
  "target": "user@example.com",
  "code": "123456"
}
```

- Nếu OTP hợp lệ:

```json
{
  "success": true,
  "purpose": "VERIFY_EMAIL",
  "target": "user@example.com"
}
```

- Nếu sai/hết hạn/vượt số lần thử:
  - BE trả về các lỗi `400/429` tương ứng (FE map sang UI).

> Lưu ý: Việc FE lưu trạng thái “email đã verify” (ví dụ trong form đăng ký) là do FE quản lý; BE chỉ trả về kết quả verify.

---

### 2.2. Behavior OTP (để FE hiểu UX)

- Độ dài OTP: **6 chữ số** (zero-padded).
- TTL mặc định: **5 phút** (`OTP_TTL_MINUTES`).
- Số lần thử tối đa: **5 lần** (`OTP_MAX_ATTEMPTS`).
- Thời gian tối thiểu giữa 2 lần gửi lại cho cùng `purpose + target`:
  - Mặc định **60 giây** (`OTP_RESEND_WINDOW_SEC`).

Gợi ý UX:

- Timer đếm ngược 60s trước khi cho phép bấm "Gửi lại OTP".
- Thông báo rõ khi OTP hết hạn hoặc sai nhiều lần.

---

### 2.3. Email template OTP verify email

Khi `purpose === "VERIFY_EMAIL"`:

- **Tiêu đề**: `[VN Tours] Xác minh email đăng ký tài khoản`
- **Nội dung**:
  - Mô tả: dùng mã OTP để hoàn tất đăng ký.
  - Hiển thị mã OTP 6 chữ số nổi bật.
  - Thông tin thời điểm hết hạn (theo giờ Việt Nam).
  - Nút/Link **"Xác minh email"** trỏ tới:
    - `FE_BASE_URL/verify-email?target=<email>`

Các `purpose` khác (nếu dùng) sẽ dùng template OTP chung với tiêu đề `[VN Tours] Mã OTP của bạn`.

---

## 3. Gợi ý flow FE

### 3.1. Flow "Quên mật khẩu"

1. **Screen 1 – Nhập identifier**
   - Input: `identifier` (username/email/phone).
   - Call `POST /api/v1/auth/forgot-password/request`.
   - Nếu 200: show message trung tính, sau đó hướng dẫn user check email.

2. **User mở email & click link**
   - FE đọc `token` từ query string và mở Screen 2.

3. **Screen 2 – Đặt lại mật khẩu**
   - Input: `new password`, `confirm password`.
   - Call `POST /api/v1/auth/forgot-password/confirm` với body `{ token, newPassword }`.
   - Nếu thành công: thông báo và redirect sang login.

---

### 3.2. Flow Register + Verify Email bằng OTP (gợi ý)

1. User nhập thông tin đăng ký (bao gồm email).
2. FE bấm “Gửi OTP xác minh email”:
   - Call `POST /api/v1/otp/send` với `{ purpose: "VERIFY_EMAIL", target: email }`.
3. User nhập OTP:
   - Call `POST /api/v1/otp/verify` với `{ purpose: "VERIFY_EMAIL", target: email, code }`.
   - Nếu `success: true` → mark email đã verify ở FE.
4. FE gọi API đăng ký user (endpoint register hiện tại giữ nguyên), có thể truyền thêm flag/email đã verify tuỳ spec BE trong tương lai.

---

## 4. Tóm tắt để FE implement nhanh

- **Reset password**
  - `POST /api/v1/auth/forgot-password/request`
    - Body: `{ "identifier": "username_or_email_or_phone" }`
    - Response OK: `{ "message": "Password reset email sent" }`
  - `POST /api/v1/auth/forgot-password/confirm`
    - Body: `{ "token": "<reset_token>", "newPassword": "NewPass123" }`
    - Response OK: `{ "message": "Password has been reset successfully" }`

- **OTP verify email**
  - Gửi OTP: `POST /api/v1/otp/send`
    - Body: `{ "purpose": "VERIFY_EMAIL", "target": "user@example.com" }`
  - Xác minh OTP: `POST /api/v1/otp/verify`
    - Body: `{ "purpose": "VERIFY_EMAIL", "target": "user@example.com", "code": "123456" }`
    - Response OK: `{ "success": true, "purpose": "VERIFY_EMAIL", "target": "user@example.com" }`

