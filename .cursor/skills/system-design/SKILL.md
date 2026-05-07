---
name: design
description: >
  Thiết kế kiến trúc hệ thống cho một feature dựa trên spec đã được approve. Sử dụng
  skill này khi user muốn "thiết kế hệ thống", "design architecture", "vẽ flow",
  "thiết kế event/queue", "data flow", "sequence diagram", hoặc bất kỳ yêu cầu nào
  liên quan đến cách các thành phần trong hệ thống tương tác với nhau. Phải có spec
  từ bước generate-spec trước khi dùng skill này. Gồm 3 layer: System Design,
  Event/Queue Design, và Flow Design.
---

# DESIGN

Mục tiêu: Quyết định HOW — hệ thống được xây dựng như thế nào, các thành phần tương
tác ra sao, dữ liệu chảy theo luồng nào. Output là blueprint để implement.

---

## Input

- Spec document từ bước `generate-spec` (bắt buộc, đã được approve)
- Nếu không có spec, yêu cầu chạy `generate-spec` trước

---

## Layer 1: System Design

### Components

Liệt kê các thành phần chính của hệ thống:

```
[Component Name]
  - Trách nhiệm: [làm gì]
  - Interface: [expose gì ra ngoài]
  - Dependencies: [phụ thuộc vào component nào]
```

### Architecture Decision Records (ADR)

Với mỗi quyết định kiến trúc quan trọng:

```
ADR-[N]: [Tên quyết định]
  Context:  [Tại sao cần quyết định này]
  Decision: [Lựa chọn gì]
  Rationale:[Lý do]
  Trade-offs:[Đánh đổi gì]
```

---

## Layer 2: Event / Queue Design

Áp dụng khi hệ thống có async processing, event-driven, hoặc message passing.

### Event Catalog

```
Event: [EventName]
  Producer: [component nào emit]
  Consumer: [component nào listen]
  Payload:  { field: type, ... }
  Trigger:  [khi nào event được emit]
  Ordering: [cần ordered hay không]
```

### Queue / Topic Design

```
Queue/Topic: [Tên]
  Type:       [FIFO / Priority / Pub-Sub / ...]
  Retention:  [bao lâu]
  DLQ:        [Dead Letter Queue strategy]
  Consumers:  [danh sách consumer]
```

### Error & Retry Strategy

- Retry policy (max retries, backoff)
- Idempotency requirements
- Poison message handling

---

## Layer 3: Flow Design

### Happy Path Flow

Mô tả luồng chính từ đầu đến cuối dưới dạng numbered steps:

```
1. [Actor] → [Action] → [Component]
2. [Component] → [Process] → [Output]
...
```

### Alternative Flows

Các luồng phân nhánh quan trọng (error cases, edge cases từ spec).

### Sequence Diagram (text format)

```
User → ServiceA: request
ServiceA → DB: query
DB → ServiceA: result
ServiceA → Queue: emit event
Queue → ServiceB: consume
ServiceB → User: response
```

---

## Checklist trước khi kết thúc Design

- [ ] Mọi FR trong spec đều có component xử lý
- [ ] Không có single point of failure chưa được acknowledge
- [ ] Mọi async operation đều có error handling
- [ ] API contract trong spec khớp với component design
- [ ] Không có circular dependency giữa các component

---

## Human Checkpoint ⚠️

Sau khi hoàn thành 3 layer, DỪNG LẠI và hỏi:

1. ADR nào cần thảo luận thêm?
2. Có flow nào bị bỏ sót không?
3. Trade-off nào chưa được chấp nhận?

---

## Output

```
design-[feature-name]/
├── system-design.md   (Layer 1)
├── event-design.md    (Layer 2, nếu có)
└── flow-design.md     (Layer 3)
```

---

## Chuyển bước tiếp theo

Khi design được approve →
**Chuyển sang skill: `implement`** với toàn bộ design docs làm input.
