---
name: verify
description: >
  Kiểm tra và xác nhận rằng feature đã implement đúng với spec và design. Sử dụng
  skill này sau khi implement xong, hoặc khi user muốn "test", "verify", "kiểm tra",
  "review code", "chạy thử", "QA", "acceptance test". Skill này bao gồm 4 lớp kiểm
  tra: static analysis, unit/integration tests, acceptance criteria check, và
  regression check. Kết quả verify quyết định feature được merge hay phải quay lại
  implement/design.
---

# VERIFY

Mục tiêu: Xác nhận với bằng chứng cụ thể rằng feature hoạt động đúng, không gây
regression, và sẵn sàng để merge/deploy.

---

## Input

- Code từ bước `implement`
- Spec document (để đối chiếu AC)
- IMPLEMENTATION_NOTES.md

---

## Layer 1: Static Analysis

Chạy tự động, không cần human review:

- [ ] Linting (không có warning nghiêm trọng)
- [ ] Type checking (nếu có typed language)
- [ ] Dependency audit (không có vulnerable package)
- [ ] Code coverage ≥ ngưỡng đã define trong spec (mặc định: 80%)

**Fail bất kỳ item nào → Block, quay về `implement`**

---

## Layer 2: Functional Testing

### Unit Tests

Chạy toàn bộ unit test suite:

- Tất cả test từ bước implement phải pass
- Không được có flaky tests

### Integration Tests

Chạy flow end-to-end:

- Happy path
- Tất cả error paths trong spec

### Report format:

```
Unit Tests:       [X passed / Y failed / Z skipped]
Integration Tests:[X passed / Y failed]
Coverage:         [X%]
```

**Có test failed → Block, quay về `implement` với report cụ thể**

---

## Layer 3: Acceptance Criteria Verification

Đối chiếu từng AC trong spec với behavior thực tế:

```
AC-[N]: [Nội dung AC]
  Status:   [✅ Pass / ❌ Fail / ⚠️ Partial]
  Evidence: [Output / log / screenshot chứng minh]
  Notes:    [Ghi chú nếu cần]
```

**AC nào fail hoặc partial → Phân tích root cause:**

- Lỗi implementation → quay về `implement`
- AC viết sai → quay về `generate-spec`
- Design không cover được AC → quay về `design`

---

## Layer 4: Regression Check

Kiểm tra feature mới không phá vỡ gì đã có:

- [ ] Chạy full test suite của codebase (không chỉ test của feature mới)
- [ ] Kiểm tra các integration point với feature cũ
- [ ] Verify performance không degraded (nếu có benchmark trước đó)

---

## Layer 5: Code Review Checklist

Agent tự review trước khi đưa cho human:

**Correctness**

- [ ] Logic match với spec
- [ ] Tất cả edge cases trong spec được handle

**Reliability**

- [ ] Error handling đầy đủ
- [ ] Không có silent failure
- [ ] Retry/timeout được config đúng

**Maintainability**

- [ ] Code có thể đọc được mà không cần comment giải thích quá nhiều
- [ ] Không có magic numbers / hardcoded values
- [ ] IMPLEMENTATION_NOTES đầy đủ

**Security** (nếu áp dụng)

- [ ] Input validation
- [ ] Không log sensitive data
- [ ] Auth/authz đúng với spec

---

## Verify Report

Tổng hợp kết quả thành một report ngắn gọn:

```markdown
## Verify Report: [Feature Name]

**Overall Status:** ✅ PASS / ❌ FAIL / ⚠️ PASS WITH NOTES

### Layer 1 - Static Analysis: [✅/❌]

### Layer 2 - Functional Tests: [✅/❌] ([X]/[Y] passed)

### Layer 3 - Acceptance Criteria: [X/Y passed]

### Layer 4 - Regression: [✅/❌]

### Layer 5 - Code Review: [✅/❌]

**Issues Found:**

- [Danh sách issue nếu có, kèm severity: Critical/Major/Minor]

**Tech Debt Logged:**

- [Items cần làm sau, không block merge]

**Recommendation:** [MERGE / FIX THEN MERGE / ESCALATE TO HUMAN]
```

---

## Human Final Checkpoint ⚠️

Sau khi Verify Report hoàn thành:

- Nếu **PASS** → Gửi report cho user, đề xuất merge
- Nếu **FAIL** → Gửi report với root cause rõ ràng, đề xuất bước quay lại
- Nếu **PASS WITH NOTES** → Gửi report, liệt kê rõ những gì cần theo dõi sau merge

**Agent không tự quyết định merge — đây là quyết định của human.**

---

## Routing khi Fail

| Vấn đề                                   | Quay về bước    |
| ---------------------------------------- | --------------- |
| Code bug / test fail                     | `implement`     |
| AC không thể satisfy với design hiện tại | `design`        |
| Requirement mâu thuẫn hoặc thiếu         | `generate-spec` |
| Scope thay đổi lớn                       | `init-feature`  |
