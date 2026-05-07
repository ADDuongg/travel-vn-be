---
name: generate-spec
description: >
  Sinh ra bản đặc tả kỹ thuật (technical spec) cho một feature dựa trên Feature Brief
  từ bước init-feature. Sử dụng skill này sau khi đã có Feature Brief được confirm,
  hoặc khi user yêu cầu "viết spec", "đặc tả kỹ thuật", "requirements document",
  "PRD", "technical spec". Skill này tạo ra tài liệu làm nền tảng cho toàn bộ quá
  trình design và implement phía sau — phải chạy trước khi design hoặc implement.
---

# GENERATE SPEC

Mục tiêu: Chuyển Feature Brief thành một bản spec đủ chi tiết để bất kỳ engineer nào
cũng có thể implement mà không cần hỏi thêm câu hỏi cơ bản.

---

## Input

- Feature Brief từ bước `init-feature` (bắt buộc)
- Nếu không có Feature Brief, yêu cầu user chạy `init-feature` trước

---

## Cấu trúc Spec

### 1. Overview

- Tên feature và version
- Mục đích (1 đoạn)
- Liên kết tới Feature Brief

### 2. Functional Requirements

Mỗi requirement viết theo format:

```
FR-[N]: [Tên]
  - Mô tả: [Chi tiết]
  - Input: [Dữ liệu đầu vào]
  - Output: [Dữ liệu đầu ra / side effects]
  - Priority: [Must / Should / Could]
```

### 3. Non-Functional Requirements

- Performance: latency tối đa, throughput kỳ vọng
- Scalability: số lượng user / request dự kiến
- Reliability: uptime, error tolerance
- Security: authentication, authorization nếu liên quan

### 4. Data Model

- Các entity chính và attributes
- Quan hệ giữa các entity
- Ví dụ dữ liệu (sample payload / schema)

### 5. API / Interface Contract

Mỗi endpoint hoặc interface:

```
[METHOD] /path
  Request:  { field: type, ... }
  Response: { field: type, ... }
  Errors:   [mã lỗi và ý nghĩa]
```

### 6. Acceptance Criteria

Danh sách điều kiện cụ thể, có thể test được:

```
AC-[N]: Given [context], When [action], Then [result]
```

### 7. Out of Scope

Liệt kê rõ những gì KHÔNG thuộc phạm vi spec này.

### 8. Open Issues

Các điểm chưa quyết định — cần human decision trước khi implement.

---

## Quy tắc viết Spec

- Mỗi requirement phải có thể verify được (tránh từ như "nhanh", "tốt")
- Không được để ambiguous — nếu không chắc thì đưa vào Open Issues
- Ưu tiên dùng ví dụ cụ thể hơn là mô tả trừu tượng
- Spec phải đủ để người không biết context vẫn hiểu được

---

## Human Checkpoint ⚠️

Sau khi viết xong spec, DỪNG LẠI và yêu cầu user review.

Hỏi cụ thể:

1. Có requirement nào bị thiếu không?
2. Có requirement nào bị hiểu sai không?
3. Các Open Issues cần quyết định gì trước khi tiếp tục?

**Không được chuyển sang bước tiếp theo khi còn Open Issues chưa được resolve.**

---

## Output

File: `spec-[feature-name].md` với đầy đủ các section trên.

---

## Chuyển bước tiếp theo

Khi spec được user approve và không còn Open Issues →
**Chuyển sang skill: `design`** với spec document làm input.
