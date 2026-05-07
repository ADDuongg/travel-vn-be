---
name: init-feature
description: >
  Khởi tạo một feature mới cho AI Agent. Sử dụng skill này khi user đề cập đến việc
  xây dựng feature mới, bắt đầu một task mới, hoặc muốn agent hiểu rõ yêu cầu trước
  khi làm gì đó. Trigger khi thấy: "làm tính năng", "build feature", "tôi muốn agent
  làm được X", "thêm chức năng", hoặc bất kỳ yêu cầu mơ hồ nào cần được làm rõ trước
  khi triển khai. LUÔN chạy skill này đầu tiên trước khi sang bất kỳ bước nào khác.
---

# INIT FEATURE

Mục tiêu: Thu thập đủ context để bắt đầu một feature một cách chắc chắn, không đoán mò.

---

## Input cần thu thập

Trước khi làm bất cứ điều gì, agent phải có đủ 4 nhóm thông tin sau:

### 1. Feature Intent

- Feature này làm gì? (mô tả ngắn gọn bằng 1-2 câu)
- Ai là người dùng cuối của feature này?
- Vấn đề nào đang được giải quyết?

### 2. Technical Context

- Tech stack hiện tại là gì? (ngôn ngữ, framework, database)
- Feature này tích hợp vào codebase có sẵn hay greenfield?
- Có constraints gì không? (performance, memory, latency)

### 3. Scope & Boundaries

- Feature này kết thúc ở đâu? (out-of-scope là gì)
- Có phụ thuộc vào feature nào khác không?
- Timeline kỳ vọng?

### 4. Success Criteria

- "Done" nghĩa là gì với feature này?
- Có edge cases nào đặc biệt cần lưu ý không?

---

## Clarification Loop

Nếu bất kỳ thông tin nào ở trên còn mơ hồ, agent PHẢI hỏi lại trước khi tiếp tục.
Không được tự suy đoán hoặc assume.

**Quy tắc hỏi:**

- Hỏi tối đa 3 câu hỏi một lần
- Ưu tiên câu hỏi có impact cao nhất
- Nếu user đã cung cấp thông tin trong conversation, extract từ đó trước — đừng hỏi lại

---

## Output

Sau khi thu thập đủ thông tin, tạo một **Feature Brief** với format:

```
## Feature Brief: [Tên feature]

**Intent:** [1-2 câu mô tả]
**User:** [Ai sử dụng]
**Tech Stack:** [Stack]
**Scope:** [In-scope / Out-of-scope]
**Dependencies:** [Danh sách nếu có]
**Success Criteria:** [Danh sách điều kiện hoàn thành]
**Open Questions:** [Các câu hỏi chưa được trả lời nếu có]
```

---

## Chuyển bước tiếp theo

Khi Feature Brief đã đầy đủ và được user xác nhận →
**Chuyển sang skill: `generate-spec`** với Feature Brief làm input.

Không được tự ý chuyển sang bước tiếp theo nếu user chưa confirm.
