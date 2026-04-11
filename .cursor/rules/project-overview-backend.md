# Backend Project Overview (Source of Truth)

## Purpose
This backend powers a travel platform:
- Hotel / room booking
- Tour booking
- Travel product e-commerce
- Location-based food discovery (Vietnam)
- Payments

Backend is the single source of truth for:
- Business logic
- Data integrity
- Security
- Payments

Frontend is a consumer only.

## Tech Stack
- NestJS + TypeScript
- MongoDB (Mongoose)
- Redis, Kafka
- JWT, RBAC
- Stripe, Cloudinary
- Socket.IO

## Architecture Rules
- Modular, domain-based
- Controller → Service → Repository
- Controllers: HTTP only
- Services: business logic
- Repositories: DB access only
- No business logic in controllers

## Data & Validation
- All inputs use DTOs
- class-validator is mandatory
- Never trust client data
- No raw request body usage

## Database
- MongoDB via Mongoose
- Avoid fat documents
- Embed vs reference based on query patterns

## Payments
- Backend owns:
  - Payment intent creation
  - Webhook verification
  - Payment state transitions
- Frontend only receives payment status

## Realtime
- Socket events only after successful transactions
- Used for booking, payment, inventory updates

## Security
- JWT authentication
- Role & permission checks
- Never expose sensitive internal logic

## Non-goals
- No UI logic
- No frontend state assumptions

## Cursor Instruction
- Always treat this file as backend source of truth
- Keep controllers thin
- Highlight breaking changes
