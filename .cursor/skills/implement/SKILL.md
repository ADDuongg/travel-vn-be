---
name: implement
description: >
  Triển khai code cho feature dựa trên spec và design đã được approve. Sử dụng skill
  này khi user muốn "viết code", "implement", "code feature này", "build this", hoặc
  bắt đầu phần lập trình thực sự. Phải có spec và design từ các bước trước. Skill này
  implement theo từng chunk nhỏ, có self-review sau mỗi chunk, và có retry loop khi
  gặp lỗi. KHÔNG implement toàn bộ feature một lúc — luôn chia nhỏ thành các unit
  độc lập có thể verify riêng lẻ.
---

# IMPLEMENT

Mục tiêu: Hiện thực hóa design thành code hoạt động được, theo từng bước nhỏ có thể
verify, không implement mù mà không có feedback loop.

---

## Input

- Spec document từ `generate-spec` (approved)
- Design documents từ `design` (approved)
- Nếu thiếu một trong hai, yêu cầu hoàn thành các bước trước

---

## Bước 1: Lập Implementation Plan

Trước khi viết bất kỳ dòng code nào, phân rã feature thành các **Implementation Units (IU)**:

```
IU-[N]: [Tên unit]
  Mô tả:      [làm gì]
  Files:      [file nào cần tạo/sửa]
  Depends on: [IU nào phải xong trước]
  Test:       [verify bằng cách nào]
  Estimated:  [S/M/L]
```

**Nguyên tắc phân rã:**

- Mỗi IU phải có thể test độc lập
- Mỗi IU không quá 200 dòng code
- Implement theo thứ tự dependency (bottom-up)
- Data model / schema trước, logic sau, integration sau cùng

---

## Bước 2: Implement từng Unit

Với mỗi IU, thực hiện theo vòng lặp:

### 2a. Pre-implementation Check

- Đọc lại FR và ADR liên quan đến IU này
- Xác nhận interface với các IU đã implement trước

### 2b. Write Code

- Viết code với đầy đủ error handling
- Thêm comments cho logic phức tạp
- Tuân thủ conventions của tech stack

### 2c. Self-Review

Sau khi viết xong mỗi IU, tự review:

- [ ] Logic có đúng với spec không?
- [ ] Error cases có được xử lý không?
- [ ] Có hardcode gì không nên hardcode không?
- [ ] Code có dễ đọc không?

### 2d. Write Unit Test

Với mỗi IU, viết test tối thiểu cho:

- Happy path
- Error cases được liệt kê trong spec
- Edge cases từ Acceptance Criteria

---

## Bước 3: Integration

Sau khi tất cả IU hoàn thành:

1. Kết nối các IU theo flow trong design
2. Chạy integration test xuyên suốt flow chính
3. Verify với từng AC trong spec

---

## Retry Loop

Khi gặp lỗi trong quá trình implement:

```
Lỗi compile / syntax  → Fix ngay, không cần escalate
Lỗi logic nhỏ        → Fix và note lại
Lỗi do spec mơ hồ    → DỪNG, hỏi user, không tự đoán
Lỗi do design sai    → DỪNG, quay lại skill `design`
Lỗi do spec sai      → DỪNG, quay lại skill `generate-spec`
```

**Nguyên tắc:** Không bao giờ workaround một vấn đề mà không hiểu root cause.

---

## Output Structure

```
[feature-name]/
├── src/
│   ├── [component files theo design]
│   └── ...
├── tests/
│   ├── unit/
│   └── integration/
└── IMPLEMENTATION_NOTES.md  ← ghi lại các quyết định trong lúc code
```

### IMPLEMENTATION_NOTES.md

Ghi lại:

- Các quyết định nhỏ trong lúc code (không có trong ADR)
- Các deviation so với design và lý do
- Known limitations
- Tech debt items

---

## Chuyển bước tiếp theo

Khi tất cả IU đã implement và integration tests pass →
**Chuyển sang skill: `verify`** với code và IMPLEMENTATION_NOTES làm input.

Nếu còn IU nào fail → Fix trước, không chuyển sang verify với broken code.
