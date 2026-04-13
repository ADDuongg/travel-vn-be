# Backend patterns — nestjs-tours

Opinionated conventions for **NestJS v11 (Express)**, **MongoDB + Mongoose**, **Redis**, **BullMQ**, **Socket.IO**, **JWT/Passport**, **class-validator**, **Zod**, **Swagger**, **Cloudinary**, **Stripe**, **Resend**, **TanStack AI**, **Pino**, **Docker**.

**Principles:** feature boundaries, async-first (queue over blocking), strict layering, no Mongoose leakage outside repositories, no heavy work in HTTP handlers.

---

## Table of contents

1. [Architecture](#architecture)
2. [Component (module) patterns](#component-module-patterns)
3. [State & data (backend)](#state--data-backend)
4. [Database (MongoDB + Mongoose)](#database-mongodb--mongoose)
5. [Caching (Redis)](#caching-redis)
6. [Queue (BullMQ)](#queue-bullmq)
7. [Realtime (Socket.IO)](#realtime-socketio)
8. [Authentication & security](#authentication--security)
9. [Validation](#validation)
10. [API design](#api-design)
11. [Error handling](#error-handling)
12. [Logging (Pino)](#logging-pino)
13. [File upload (Cloudinary)](#file-upload-cloudinary)
14. [Payment (Stripe)](#payment-stripe)
15. [Email (Resend)](#email-resend)
16. [AI integration (TanStack AI / OpenAI)](#ai-integration-tanstack-ai--openai)
17. [Performance](#performance)
18. [Testing](#testing)
19. [Security checklist](#security-checklist)
20. [DO / DON’T](#do--dont)
21. [Anti-patterns](#anti-patterns)

---

## Architecture

### Feature-based module structure

Organize by **business capability** (`tour`, `booking`, `payment`, `user`, …), not by technical layer at repo root. Each feature owns its HTTP surface, application logic, and persistence adapters.

**Typical layout (inside `src/<feature>/`):**

| Artifact | Responsibility |
|----------|----------------|
| `*.module.ts` | Wires providers, imports, exports |
| `*.controller.ts` | HTTP: routing, guards, pipes, thin delegation |
| `*.service.ts` | Use cases, orchestration, domain rules |
| `*.repository.ts` | Mongoose access only here |
| `schemas/` | Mongoose schemas + indexes |
| `dto/` | Request/response DTOs + Swagger metadata |
| `processors/` | BullMQ consumers (optional) |
| `*.gateway.ts` | Socket.IO (optional) |

**Shared** code lives in `src/shared/` (guards, filters, interceptors, utils) — not business rules.

### Controller / service / repository

- **Controller:** parse/validate input (DTO + pipes), call **one** service method, return result. No transactions spanning unrelated features here; orchestration belongs in services.
- **Service:** business rules, workflow, calls to repositories, cache, queues, other services. **The only place** that should know “what the feature does.”
- **Repository:** CRUD and query construction against Mongoose. **Only layer** that imports `InjectModel` / document types for persistence. Returns plain objects or lean results where appropriate — not “half the app” depending on Mongoose documents.

### Layer boundaries

```
HTTP  →  Controller  →  Service  →  Repository  →  MongoDB
                    ↘  Cache (Redis) / Queue (BullMQ) / Events
```

- **Do not** inject `Model` into controllers or high-level services that are not repositories.
- **Do** inject abstractions (`TourRepository`) if you need easier testing; default to concrete repository classes in the same module unless duplication forces an interface.

---

## Component (module) patterns

### Module organization

- **`imports`:** Mongoose `forFeature` for this feature’s schemas only; `BullModule.registerQueue` for named queues owned here; `forwardRef` only to break circular deps — then **narrow** what each side needs (prefer events or a small facade over giant mutual imports).
- **`providers`:** services, repositories, processors, gateway adapters.
- **`exports`:** only what other modules must use (often **services** and **queue registration** if producers live elsewhere). **Do not** export Mongoose models unless there is a deliberate shared-data module (rare).

### Provider structure

- **One class, one role:** `TourService` does not also implement SMTP or Stripe.
- **Use `@Injectable()`** on anything injected.
- Prefer **constructor injection** only; avoid `ModuleRef.get` except for dynamic plugins.

### Dependency injection

- Register **feature-scoped** providers in the feature module.
- For **global** cross-cutting concerns (logger, config), use dynamic modules or `APP_*` providers in `AppModule` sparingly.
- **Config:** inject `ConfigService` or validated env object from `EnvModule` — never `process.env` in services (tests and typing break).

```typescript
// tour.module.ts — sketch
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Tour.name, schema: TourSchema }]),
    BullModule.registerQueue({ name: 'tour-email' }),
  ],
  controllers: [TourController],
  providers: [TourService, TourRepository],
  exports: [TourService],
})
export class TourModule {}
```

---

## State & data (backend)

### MongoDB vs Redis vs queue

| Store | Use for |
|-------|---------|
| **MongoDB** | Source of truth: users, bookings, tours, audit-friendly documents |
| **Redis** | Ephemeral: cache, rate-limit buckets, BullMQ metadata, pub/sub if used |
| **BullMQ** | Work that must **complete later**: email, exports, webhooks fan-out, AI batch, notifications fan-out |

**Rule:** if losing the data on Redis restart is unacceptable for **business facts**, it belongs in MongoDB (possibly with a job id pointing to a document).

### Cache-aside

1. Read path: try **cache** → on miss, load from **repository** → **set** TTL → return.
2. Write path: update **MongoDB** first (or in one logical transaction where applicable) → **invalidate** or **update** cache keys affected.

Use **key namespaces**: `tour:slug:{slug}`, `user:profile:{id}`. TTL depends on volatility (see [Caching](#caching-redis)).

### Data consistency (document DB)

- **No cross-document ACID** like SQL; design **denormalized fields** when read performance matters (e.g. embedded summary on booking), with clear **single-writer** rules.
- **Multi-step updates:** use MongoDB **transactions** only when necessary (replica set); otherwise prefer **idempotent** updates and compensating jobs.
- **Eventual consistency:** acceptable for cache and async workers; **document state** must converge via retries and idempotent handlers.

---

## Database (MongoDB + Mongoose)

### Schema design

- Prefer **clear ownership**: one module owns a schema; references by `ObjectId` + `ref` when you need `populate` sparingly.
- **Embed** when data is always loaded together and bounded in size; **reference** when shared or large arrays would bloat documents.
- **Avoid unbounded arrays**; use separate collections for unbounded lists (e.g. messages, audit lines) with pagination indexes.
- Use **enums / union literals** in schema where the domain is fixed; keep **validation** aligned with DTOs.

### Lean queries

Default to **`.lean()`** for read paths that return JSON — smaller overhead, plain objects, no change tracking.

```typescript
// repository
async findBySlug(slug: string): Promise<TourLean | null> {
  return this.model
    .findOne({ slug })
    .lean()
    .exec();
}
```

Use full **documents** when you need instance methods, middleware, or save hooks in the same request (rare for APIs — prefer explicit updates in repository).

### Indexing

- Index fields used in **filters** and **sorts**; compound indexes match **query shape** (equality fields first, then range).
- Add **`{ unique: true }`** where the domain requires uniqueness (e.g. email, slug).
- **Explain** slow queries in staging; avoid **in-memory sort** on large collections.

### Repository pattern

All `Model` usage stays in `*Repository` (or `*MongoRepository`). Services call repository methods with **primitive/DTO inputs**, not raw Mongoose queries.

```typescript
@Injectable()
export class TourRepository {
  constructor(
    @InjectModel(Tour.name) private readonly tourModel: Model<TourDocument>,
  ) {}

  findByIdForRead(id: string) {
    return this.tourModel.findById(id).lean().exec();
  }

  async updateStatus(id: string, status: TourStatus) {
    const doc = await this.tourModel.findByIdAndUpdate(
      id,
      { $set: { status, updatedAt: new Date() } },
      { new: true },
    ).lean();
    return doc;
  }
}
```

---

## Caching (Redis)

### Strategy

- **Read-heavy, rarely changing:** cache-aside with longer TTL (e.g. province lists, static configs).
- **Per-user session-ish data:** short TTL + explicit invalidation on update.
- **Never cache** secrets, full payment payloads, or unredacted PII unless necessary and encrypted.

### TTL rules (guideline)

| Data | TTL |
|------|-----|
| Reference data (provinces, amenities) | 1h–24h |
| Entity by id (tour, user profile public) | 1–15m |
| Hot lists (home feed) | 30s–5m |
| Rate limit / OTP buckets | as per security spec |

Tune with metrics: hit ratio, stale tolerance, invalidation complexity.

### Invalidation

- **Key delete** on write: `del tour:id:*` patterns — use **hashed or predictable keys** to avoid flush-all.
- **Version suffix:** `tour:{id}:v{version}` to invalidate by bumping version on write (advanced, good for high fan-out).
- **TTL-only** for data where occasional staleness is OK.

---

## Queue (BullMQ)

### Job patterns

- **One job = one clear purpose:** `send-booking-confirmation`, `sync-stripe-customer`.
- **Payload:** ids + minimal context — re-load authoritative state from MongoDB in the processor.
- **Named jobs** for different behaviors within the same queue when sharing workers.

```typescript
// producer (service)
await this.emailQueue.add(
  'booking-confirmation',
  { bookingId },
  { attempts: 5, backoff: { type: 'exponential', delay: 2000 } },
);
```

### Retry strategy

- **Transient failures:** exponential backoff, cap `attempts` (e.g. 3–10 depending on cost).
- **Poison messages:** move to **failed** after max attempts; **alert** + manual replay from dashboard or admin tool.
- **Non-retryable:** validation errors, missing entity — **fail fast** in processor, do not burn retries.

### Failure handling

- Log **job id**, **name**, **attempt**, **error stack** (Pino).
- **Idempotent** processors: safe if the same job runs twice (Stripe emails, notifications).

### Async processing design

- HTTP handler: validate → persist → **enqueue** → return `202` or result with “pending” state if product requires it.
- **Do not** await long BullMQ completion in the request unless you have a strict SLA and use a different pattern (polling / websocket completion).

---

## Realtime (Socket.IO)

### Gateway vs service

- **Gateway:** connection lifecycle, auth handshake, subscribe/unsubscribe, **delegate** to services for business logic.
- **Service:** loads data, checks permissions, prepares payloads; **gateway** emits results.

### Event-driven patterns

- Prefer **domain events** after successful writes: service emits (EventEmitter or explicit service) → gateway layer or separate notifier fans out to rooms.
- **Room naming:** predictable and authenticated (`user:{userId}`, `booking:{bookingId}`) — **never** trust client-provided room ids without server-side membership checks.

### Validation

- Use **DTO + validation pipe** for `SubscribeMessage` payloads where applicable; reject malformed events early.
- **Re-check authorization** on every event (JWT can expire; membership can change).

```typescript
@SubscribeMessage('joinBooking')
async handleJoin(
  @ConnectedSocket() client: Socket,
  @MessageBody() dto: JoinBookingDto,
) {
  await this.bookingRealtimeService.assertCanView(client.data.user, dto.bookingId);
  await client.join(`booking:${dto.bookingId}`);
}
```

---

## Authentication & security

### JWT + Passport

- **Strategies:** separate concerns — e.g. JWT access, optional refresh handled in auth module.
- **Guards** at controller or method level; **default deny** for protected routes.
- Put **`userId` / roles** on `request.user` via validated payload typing.

### Password hashing (bcrypt)

- **bcrypt** cost factor tuned to env (e.g. 12+ in production); never log passwords or hashes.
- Constant-time comparison only where relevant (OTP codes) — not for bcrypt verify (library handles).

### Rate limiting

- Use **`@nestjs/throttler`** (or Redis-backed store for multi-instance) on auth and public endpoints.
- Stricter limits on **login**, **OTP**, **password reset**.

### Request validation

- Global **ValidationPipe** with `whitelist`, `forbidNonWhitelisted`, `transform` for DTOs.
- **Do not** trust query/body/headers for security decisions without guards + repository checks.

---

## Validation

### DTOs (class-validator)

- DTO per **command** (`CreateTourDto`) not one mega-class reused everywhere.
- **Separate** create/update/patch DTOs; use `PartialType`, `PickType` from `@nestjs/mapped-types` where appropriate.
- Align **enum** strings with Mongoose schema.

```typescript
export class CreateTourDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  title: string;

  @IsMongoId()
  provinceId: string;
}
```

### Zod for config

- Validate **env** once at bootstrap (`env.validation.ts` / custom provider). Fail fast if invalid.
- **Do not** duplicate large Zod schemas for HTTP bodies unless you standardize on Zod for APIs project-wide (this stack uses class-validator for HTTP — keep one approach per layer).

### Input sanitization

- Trim strings where meaningful; reject **prototype pollution** keys in raw body (framework defaults + avoid deep merge from untrusted input).
- For **HTML** fields: sanitize if you render rich text (policy depends on product).

---

## API design

### RESTful patterns

- **Nouns** for resources: `/tours`, `/tours/:id/bookings`.
- **Verbs** as sub-resources or actions only when necessary: `POST /bookings/:id/cancel` with body/DTO.
- **Consistent** status codes: `201` + `Location` on create, `204` on delete if no body, `409` for conflicts.

### Response standardization

- Use an **interceptor** or small helpers for `{ data, meta }` or your agreed envelope.
- **Pagination:** `limit`, `cursor` or `page` + `limit` — return **`nextCursor`** or **`total`** as product requires.

```typescript
// pagination params (DTO)
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  cursor?: string;
}
```

---

## Error handling

### Global exception filter

- Map known errors to **stable** `code` + `message` + optional `details`.
- **Hide** stack traces in production responses; log full context server-side.

### Error normalization

- **Domain errors:** custom classes (`BookingNotFoundError`) caught in filter or thrown as `NotFoundException` with consistent body.
- **Mongoose:** cast errors → `400`; duplicate key → `409`.

### Logging strategy

- On **5xx**, log **error** with correlation id, user id (if any), route, and sanitized input refs.
- On **4xx**, usually **warn** or **info** depending on abuse vs client mistake.

---

## Logging (Pino)

### Structured logging

- Log **objects** as first argument: `logger.info({ bookingId }, 'Booking confirmed')`.
- **Never** log tokens, passwords, full card numbers, or entire webhook bodies.

### Correlation id

- Accept `x-request-id` or generate UUID; attach to **async local storage** or request scope; include in **every** log line for that HTTP request and downstream jobs where propagated.

### Log levels

| Level | Use |
|-------|-----|
| `error` | Failures requiring action |
| `warn` | Degraded, retries, suspicious |
| `info` | Business milestones, startup |
| `debug` | Development / transient diagnostics |

---

## File upload (Cloudinary)

### Flow

1. Client requests **upload signature** or uploads via backend **stream** — prefer **direct signed upload** from client when acceptable to reduce server load; otherwise **buffer/stream** through Nest with size limits.
2. **Validate** MIME, size, dimensions server-side before persisting references.
3. Store **`public_id` + secure URL** (or transformation template) in MongoDB via repository.

### Service abstraction

- **`CloudinaryService`** wraps SDK; features call **UploadService** / **MediaService**, not raw SDK everywhere.

```typescript
async uploadTourCover(file: Express.Multer.File, tourId: string) {
  this.assertImage(file);
  const res = await this.cloudinary.upload(file, { folder: `tours/${tourId}` });
  return { publicId: res.public_id, url: res.secure_url };
}
```

---

## Payment (Stripe)

### Webhook handling

- **Dedicated** route: raw body for signature verification (Express raw middleware on that path only).
- **Verify** `stripe-signature` with webhook secret; reject on mismatch.

### Idempotency

- Store **Stripe event id** (or dedupe key) in MongoDB before processing; **skip** if already processed.
- Handlers update domain state in **idempotent** steps (same event twice → same final state).

### Secure flow

- **Never** trust client with amounts — compute server-side from **your** prices/inventory.
- Use **PaymentIntent** / **Checkout** flows per product; return only **client-safe** secrets.

---

## Email (Resend)

### Queue-based sending

- **HTTP path:** persist intent → `emailQueue.add` → return.
- **Processor** loads template data from DB, calls **Resend**, handles bounces via provider webhooks if integrated.

### Retry strategy

- Same as [Queue](#queue-bullmq): exponential backoff; cap attempts; dead-letter for inspection.

---

## AI integration (TanStack AI / OpenAI)

### Service isolation

- **`AiService` / `TourCopilotService`** encapsulates prompts, model choice, and tool wiring.
- **No** direct OpenAI calls from controllers or random features — go through one module to cap **tokens**, **timeouts**, and **logging**.

### Timeout / fallback

- Set **request timeout** and **max tokens**; on failure return **graceful degradation** (cached copy, human handoff flag) depending on product.
- **Never** block HTTP on long runs — use **queue** for batch or long generations.

---

## Performance

- **N+1:** avoid repeated `findById` in loops — use **`$in`** queries or aggregation **`$lookup`** when justified (measure first).
- **Caching:** cache hot reads; invalidate on writes.
- **Pagination:** always cap `limit` (e.g. max 100).
- **Async:** offload heavy work to **BullMQ**; use **aggregations** for reports, not loading full collections into memory.

---

## Testing

| Layer | Focus |
|-----|-------|
| **Unit** | Services: mock repositories, queues, Redis |
| **Integration** | Repository + MongoDB (test containers or dedicated DB), verify indexes and queries |
| **E2E** | HTTP + real app module with test doubles for external APIs (Stripe, Resend, OpenAI) |

- Use **fixed clocks** for time-dependent logic.
- **Stripe:** use **test keys** and webhook fixtures.

---

## Security checklist

- **helmet** enabled; **CORS** restricted to known origins.
- **Throttler** on sensitive routes.
- **Validation** everywhere; **sanitize** rich text if applicable.
- **Secrets** only via env / secret manager; **rotate** JWT and webhook secrets on compromise procedure.
- **Dependabot** / regular `yarn audit`; minimal Docker images.

---

## DO / DON’T

| DO | DON’T |
|----|--------|
| Keep Mongoose in repositories | Spread `InjectModel` across services/controllers |
| Enqueue mail/AI/report jobs | `await sendEmail()` in controllers |
| Use lean reads for API responses | Return mutable documents everywhere without reason |
| Invalidate or TTL cache on domain rules | Cache forever without strategy |
| Verify Stripe webhooks with raw body | Parse JSON before signature verify |
| Log with correlation ids | Log secrets or full PII |
| Use DTO + pipe for input | Trust client shape |
| Design idempotent workers | Assume jobs run exactly once |
| Use indexes matching queries | Add random indexes “just in case” |
| Keep gateways thin | Put DB logic inside `@SubscribeMessage` only |

---

## Anti-patterns

1. **Anemic HTTP, fat controller** — business rules in controller methods; multiple DB calls inline.
2. **Repository theater** — repository that returns Mongoose `Query` objects for callers to finish (leaks persistence).
3. **Redis as primary DB** — durable business facts only in Redis.
4. **Blocking the event loop** — CPU-heavy sync work on hot paths; huge JSON deep-clones.
5. **Populate chains** — `populate` without limit leading to huge graphs; prefer explicit queries or denormalization.
6. **Fire-and-forget promises** — `void promise` in HTTP without logging; use queue or structured `try/catch`.
7. **Global mutable singletons** for request data — use ALS or explicit parameters.
8. **Webhook without idempotency** — double payment state updates on Stripe retries.
9. **Socket auth once** — never re-checking membership on sensitive events.
10. **Tutorial-style generic providers** — interfaces for every class without multiple implementations (YAGNI).

---

## Quick reference — where does it go?

| Concern | Layer |
|---------|--------|
| Route, status, guard | Controller |
| Business rules, orchestration | Service |
| Mongoose queries | Repository |
| Cache get/set/invalidate | Service or dedicated `CacheService` |
| Background work | BullMQ processor |
| Realtime emit | Gateway + realtime service |
| Env shape | Zod + ConfigModule |
| HTTP body/query | class-validator DTO |
| Stripe charge state | Service + webhook processor + MongoDB |
| Audit trail | Pino + optional collection |

---

*Document version: aligned with Nest 11, Mongoose 8, BullMQ 5, Redis 7. Adjust TTLs and limits using production metrics.*
