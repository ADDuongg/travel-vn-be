---

```md
# Backend Project Overview (Travel Platform)

## 1. Project Purpose

This backend system powers a travel platform that supports:
- Hotel room booking
- Tour booking
- E-commerce for travel-related products
- Location-based food discovery across Vietnam
- Payment processing
- Real-time booking & payment updates

The backend is the single source of truth for:
- Business rules
- Data integrity
- Security
- Payments

---

## 2. Tech Stack

### Core
- NestJS
- TypeScript

### Database
- MongoDB
- Mongoose

### Caching & Messaging
- Redis
- Kafka

### Auth & Security
- JWT
- Role-based access control

### Media & Payment
- Cloudinary (image/media storage)
- Stripe (payments)

### Realtime
- Socket.IO (server)

---

## 3. High-Level Architecture

- Domain-driven, module-based architecture
- Clear separation of concerns:
  - Controller → Service → Repository
- Backend owns all business logic
- Frontend is a consumer only

---

## 4. Project Folder Structure

```txt
src/
├───amenities
│   ├───dto
│   ├───entities
│   └───schema
├───api-permission
│   ├───dto
│   ├───entities
│   └───schema
├───api-role
│   ├───dto
│   ├───entities
│   └───schema
├───auth
│   ├───dto
│   ├───interfaces
│   └───schema
├───booking
│   ├───dto
│   ├───entities
│   └───schema
├───cloudinary
├───enum
├───env
├───guards
├───hotel
│   ├───dto
│   ├───entities
│   └───schema
├───idempotency
│   ├───dto
│   ├───entities
│   └───schema
├───interceptor
├───jwt
├───language
│   ├───dto
│   ├───entities
│   └───schema
├───media
│   ├───dto
│   └───entities
├───middleware
├───orders
│   ├───dto
│   ├───entities
│   └───schema
├───payment
│   ├───dto
│   ├───entities
│   └───schema
├───permission
├───pipe
├───product
│   ├───dto
│   └───entities
├───review
│   ├───dto
│   ├───entities
│   └───schema
├───roles
│   ├───dto
│   ├───entities
│   └───schemas
├───room
│   ├───dto
│   ├───entities
│   └───schema
├───room-inventory
│   ├───dto
│   ├───entities
│   └───schema
├───router-role
│   ├───dto
│   ├───entities
│   └───schema
├───routers
│   ├───dto
│   ├───entities
│   └───schemas
├───shared
├───socket
├───upload
├───user
│   ├───dto
│   ├───entities
│   ├───interfaces
│   └───schema
├───utils
└───validators
└─ main.ts
5. Module Responsibilities
Controller

Request validation

Auth & guards

Delegation only

Service

Business logic

Transactions

Cross-module orchestration

Repository

Database access

Mongoose queries

No business logic

6. Validation & DTO Rules
All inputs must use DTOs

Validation via class-validator

No raw request body usage

Never trust client data

7. Database Rules
MongoDB via Mongoose

Use schema-level validation

Avoid fat documents

Reference vs embed based on query patterns

8. Caching & Messaging
Redis
Cache hot data

Session & token-related data

Booking availability snapshots

Kafka
Booking events

Payment events

Notification triggers

Analytics pipeline

9. Payment Flow (Stripe)
Backend owns:

Payment intent creation

Webhook verification

Payment state transitions

Frontend only receives status

10. Realtime (Socket.IO)
Used for:

Booking confirmation

Payment status

Inventory updates

Socket events are emitted only after transaction success

11. Security Rules
JWT-based authentication

Role & permission checks

Never expose internal IDs blindly

Sensitive logic never goes to frontend

12. Non-Goals (Backend)
No UI logic

No frontend state assumptions

No direct DOM or client handling

13. Cursor Instructions
Always follow this file as backend source of truth

Keep controllers thin

Business logic must live in services

Avoid cross-module tight coupling

Highlight breaking changes clearly