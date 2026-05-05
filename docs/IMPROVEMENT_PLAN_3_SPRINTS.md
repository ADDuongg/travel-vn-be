# Improvement Plan — 3 Sprints

Kế hoạch này ưu tiên các hạng mục có tác động lớn nhất đến độ ổn định, khả năng scale team, và vận hành production.

Mục tiêu tổng: chuẩn hóa kiến trúc theo `Controller -> Service -> Repository`, tăng reliability của error/queue/logging, và dựng nền test + operability.

---

## Sprint 1 (Tuần 1-2) — Chuẩn hóa nền tảng kiến trúc

### Objective

Ổn định kiến trúc lõi để giảm technical debt ngay trên luồng nghiệp vụ chính.

### Scope

1. Chuẩn hóa Repository Layer cho các module critical:
   - `tour`
   - `booking`
   - `payment`
   - `user`
   - `review`
2. Tạo Error Hierarchy dùng chung:
   - `AppException`
   - `DomainException`
   - `NotFoundDomainException`
   - `ForbiddenDomainException`
   - `InfrastructureException`
3. Nâng Global Exception Filter:
   - Mapping exception nhất quán
   - Trả response lỗi theo cùng format
   - Không leak nội dung nội bộ

### Deliverables

- Tạo `XxxRepository` cho 5 module trên; service không còn `@InjectModel`.
- Bộ exceptions dùng chung dưới `src/common/exceptions/`.
- Global filter xử lý thống nhất toàn bộ lỗi runtime và business lỗi đã định nghĩa.
- Bộ test mỏng chống regression cho refactor:
  - 5-10 test case service/repository cho `booking` + `payment`
  - Contract test cho error response format của 2 module critical

### Definition of Done

- Không còn `@InjectModel` trong 5 service module mục tiêu.
- Error response format mới áp dụng cho 100% endpoint của 5 module mục tiêu.
- Không còn `console.log` mới trong flow nghiệp vụ các module này.
- CI chạy pass bộ test mỏng chống regression của Sprint 1.

### Risk / Lưu ý

- Refactor layer data access dễ phát sinh regression query.
- Cần test manual các luồng: tạo/sửa/xóa tour, booking flow, payment callback.

---

## Sprint 2 (Tuần 3-4) — Reliability cho async flow + observability

### Objective

Trace được request end-to-end và giảm rủi ro xử lý lặp ở queue/event.

### Scope

1. Structured logging + correlation ID end-to-end:
   - HTTP middleware nhận/generate `x-request-id`
   - Propagate request id vào event payload và queue job data
   - Worker log lại cùng correlation id
2. Domain event contract typed:
   - Chuẩn `base domain event`
   - Mỗi event có contract rõ, hạn chế payload trôi tự do
3. Queue reliability:
   - Chuẩn hóa `jobId`, retry/backoff, retention
   - Quy ước xử lý fail + kênh alert
   - Rà soát idempotency cho job critical (booking/payment/notification)

### Deliverables

- Tài liệu quy ước log fields và event contract.
- Các job critical có `jobId` và policy retry/retention thống nhất.
- Processor có fail handling rõ ràng, có log đủ context để debug.

### Definition of Done

- Có thể trace một request từ controller -> service -> event -> queue -> worker qua `requestId`.
- Job retry không gây duplicate side-effect trên luồng critical.
- Tỷ lệ lỗi queue có thể quan sát và phân tích được qua logs/metrics.

### Risk / Lưu ý

- Propagate correlation id cần đồng bộ nhiều module một lúc.
- Đổi contract event có thể ảnh hưởng listener hiện hữu.

---

## Sprint 3 (Tuần 5-6) — Testability + Operability + Security hardening

### Objective

Đảm bảo hệ thống sẵn sàng chạy production ổn định và dễ vận hành lâu dài.

### Scope

1. Testing strategy theo tầng:
   - Unit test cho service trọng điểm (`booking`, `payment`, `tour`)
   - Integration test cho repository query phức tạp
   - E2E happy-path cho booking/payment/tour
2. Health & readiness:
   - Nâng cấp endpoint health với check dependency quan trọng:
     - MongoDB
     - Redis
     - Queue connectivity (mức tối thiểu có thể quan sát)
3. Security + API consistency:
   - Rà soát throttling ở route nhạy cảm
   - Chuẩn hóa response envelope (success/error)
   - Kiểm tra không log dữ liệu nhạy cảm

### Deliverables

- Bộ test chạy qua CI cho critical flow.
- Health/readiness endpoint đủ dùng cho deploy pipeline.
- Tài liệu API envelope và security checklist cập nhật.

### Definition of Done

- Unit test pass ổn định cho module trọng điểm.
- E2E critical happy paths chạy pass trên CI.
- Health endpoint phản ánh đúng trạng thái dependency chính.
- Route nhạy cảm có rate limit phù hợp.

### Risk / Lưu ý

- Viết test cho flow thanh toán cần môi trường giả lập/fixture chuẩn.
- Nếu thay đổi response envelope, cần thông báo FE để đồng bộ contract.

---

## Ưu tiên thực thi (khuyến nghị)

1. Làm dứt điểm Sprint 1 trước khi mở rộng test/observability sâu.
2. Sprint 2 chỉ tập trung reliability/traceability, tránh trộn thêm refactor lớn.
3. Sprint 3 chốt chất lượng phát hành: test + health + security.

---

## KPI theo dõi sau mỗi sprint

- Sprint 1:
  - Số service còn `@InjectModel` trong 5 module critical: mục tiêu `0`.
  - Tỷ lệ endpoint (5 module critical) trả đúng error envelope mới: mục tiêu `>= 95%` trong sprint, `100%` khi chốt sprint.
- Sprint 2:
  - Tỷ lệ log có `requestId` ở HTTP + worker: mục tiêu `>= 90%`.
  - Số incident duplicate side-effect do queue retry: mục tiêu `0` trên luồng critical.
- Sprint 3:
  - Tỷ lệ pass test CI cho critical flows: mục tiêu `100%` ở nhánh release.
  - Thời gian xác định root cause incident (MTTR điều tra): giảm tối thiểu `30%` so baseline Sprint 1.

---

## Gợi ý phân bổ nhân sự

- 1 backend lead: ownership kiến trúc + review standards.
- 1-2 backend dev: refactor repository + error + event/queue.
- 1 dev/test owner: thiết kế test case critical + CI gate.

Khi nguồn lực mỏng, ưu tiên: **Repository + Error + Correlation + Queue idempotency** trước các hạng mục còn lại.
