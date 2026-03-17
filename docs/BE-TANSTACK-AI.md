## Mục tiêu

Chuẩn hóa BE NestJS `nestjs-tours` để dùng **TanStack AI** cho endpoint `/api/chat`:

- Dùng `@tanstack/ai` + `@tanstack/ai-openai` để stream.
- Trả về SSE đúng spec TanStack (để FE dùng `useChat` + `fetchServerSentEvents`).
- Map lại các tool hiện có (`searchHotels`, `searchTours`, …) sang tool của TanStack.

---

## 1. Cài đặt dependency

Trong project `nestjs-tours`:

```bash
pnpm add @tanstack/ai @tanstack/ai-openai
# hoặc
npm install @tanstack/ai @tanstack/ai-openai
```
