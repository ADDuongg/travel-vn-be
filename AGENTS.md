# AI SYSTEM — Backend Project Brain

@include ./skills/backend-patterns.md
@include ./skills/deployment-patterns/SKILL.md

---

## SYSTEM PURPOSE

This file is the central brain of the backend project.

All included files and rules form a **unified system**.

Always follow them consistently.

---

## PROJECT CONTEXT

This is a production-grade backend system.

### Tech Stack

- NestJS v11 (Express)
- MongoDB + Mongoose
- Redis + ioredis
- BullMQ (queue)
- Socket.IO (realtime)
- JWT + Passport (authentication)
- class-validator + class-transformer (DTO validation)
- Zod (env validation)
- Swagger (OpenAPI)
- Cloudinary (file upload)
- Stripe (payment)
- Resend (email)
- TanStack AI (OpenAI integration)
- Pino (logging)
- Docker + Docker Compose

---

## ARCHITECTURE

- Feature-based modules
- Clear separation:
  - Controller (HTTP layer)
  - Service (business logic)
  - Repository (database access)
  - DTO (validation & typing)

---

## CORE RULES

- Always follow backend-patterns
- Do not access database outside repository layer
- Do not put business logic in controllers
- Do not block request lifecycle (use queue for async tasks)
- Do not introduce new libraries unless necessary
- Keep code scalable and maintainable
- Avoid over-engineering

---

## GLOBAL BEHAVIOR

Act as a senior NestJS engineer.

- Think before coding
- Prefer async-first design
- Prefer scalable and modular architecture
- Avoid generic or template-like code
- Ensure all code is production-ready

---

# BACKEND DESIGN PRINCIPLES

## Core Principles

- Modular architecture
- Separation of concerns
- Async-first mindset
- Event-driven where appropriate
- Observable and debuggable system

---

## Data Flow

- Request → Controller → Service → Repository → DB
- Async tasks → Queue (BullMQ)
- Realtime → Gateway → Service

---

## Anti-Design Rules

- No fat controllers
- No direct DB access outside repository
- No blocking heavy operations in request lifecycle
- No duplicated business logic

---

# BACKEND PATTERNS

## Module Design

- Use feature-based modules
- Keep modules isolated and cohesive
- Avoid cross-module tight coupling

---

## Controller Rules

- Handle request/response only
- Delegate logic to services
- Validate input using DTO

---

## Service Rules

- Contain business logic
- Orchestrate repository, queue, and external services
- No direct HTTP handling

---

## Repository Rules

- Encapsulate all DB queries
- Use Mongoose models internally
- Always use `.lean()` for reads
- Do not expose raw models outside

---

## State & Data Management

- MongoDB → primary data storage
- Redis → cache & ephemeral state
- BullMQ → async processing

---

## Database (MongoDB)

- Prefer document-based design
- Avoid relational mindset
- Use indexing where needed
- Use pagination for large datasets

---

## Caching (Redis)

- Use cache-aside pattern
- Always define TTL
- Cache only safe (idempotent) data

---

## Queue (BullMQ)

- Use for:

  - email sending
  - heavy processing
  - async workflows

- Always:
  - define retry strategy
  - handle failures
  - log job status

---

## Realtime (Socket.IO)

- Use gateway for transport
- Use service for logic
- Validate all incoming data

---

## Authentication

- Use JWT + Passport
- Hash passwords with bcrypt
- Centralize auth logic

---

## Validation

- Validate all inputs via DTO
- Use class-validator
- Use Zod for env config

---

## API Design

- Follow REST principles
- Use consistent response format
- Implement pagination for lists

---

## Error Handling

- Use global exception filter
- Normalize error responses
- Never expose internal stack trace

---

## Logging (Pino)

- Structured logging
- Include request context (correlationId)
- Avoid console.log

---

## File Upload

- Use service abstraction
- Validate file type & size
- Upload to Cloudinary only

---

## Payment (Stripe)

- Use webhook for confirmation
- Ensure idempotency
- Do not trust client-side results

---

## Email (Resend)

- Always send via queue
- Retry on failure

---

## AI Integration

- Isolate AI logic in services
- Handle timeouts & fallback
- Validate inputs

---

## Performance

- Avoid N+1 queries
- Use caching where appropriate
- Use pagination
- Offload heavy tasks to queue

---

# DEVELOPMENT WORKFLOW

## Planning

- Break tasks into smaller units
- Identify async vs sync operations
- Design data flow before coding

---

## Implementation

- Follow architecture strictly
- Keep functions small and readable
- Avoid duplication

---

## Refactoring

- Improve structure without breaking behavior
- Simplify logic
- Ensure consistency with patterns

---

## Code Review

- Detect anti-patterns
- Ensure separation of concerns
- Check scalability and performance

---

# DEPLOYMENT (BACKEND)

## Strategy

- Containerized deployment (Docker)
- Stateless API instances
- Externalize state (DB, Redis)

---

## Rules

- Use environment variables
- Validate config at startup
- Do not hardcode secrets

---

## Performance

- Enable logging and monitoring
- Use caching effectively
- Optimize DB queries

---

# GLOBAL ENFORCEMENT

Always:

- Follow backend-patterns
- Maintain clean architecture
- Prefer async over blocking
- Keep system observable and scalable

If there is any conflict:

→ Choose the solution that is:

- More scalable
- More maintainable
- More consistent with backend patterns

---

# FINAL PRINCIPLE

This is NOT a generic backend.

All output must:

- Follow architecture strictly
- Be production-ready
- Be scalable and maintainable
- Be secure and observable
