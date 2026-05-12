# Prompt for Cursor: Build Database Workflow (NestJS + MongoDB)

## Goal
Create a clean, production-style database workflow for my NestJS project using MongoDB. I need **migrations** and **2 main data modes**:

1. **Seed from staging snapshot** (recommended daily local dev mode)
2. **Pull direct data from staging** (for debugging real issues)

Please implement scripts, folder structure, and documentation.

---

## Project Context
- Backend: NestJS
- Database: MongoDB
- Local dev uses Docker Compose for MongoDB + Redis
- Backend runs locally with `yarn start:dev`
- Existing migration tool may be `migrate-mongo` (reuse if available)

---

## Requirements

## 1. Folder Structure
Create a clean structure like:

```text
/scripts/database/
  migrate.ts
  seed.ts
  pull-staging.ts
  snapshot-to-seed.ts
  sanitize.ts
  reset.ts
/seeds/
  base/
  realistic/
/backups/
/docs/database-workflow.md
```

If TypeScript is best, use TypeScript.

---

## 2. Migration System
IMPORTANT: Migration names are manually provided by the developer. Use clear descriptive names like `add-slug-to-hotels`, `create-email-index-on-users`, `backfill-cityId-for-hotels`. Do NOT au
Need commands for:

```bash
yarn db:migrate
yarn db:migrate:down
yarn db:migrate:create -- add-slug-to-hotels
```

Requirements:
- Safe to run multiple times if possible
- Uses current `.env.local`
- Clear logs
- Fail fast on errors

---

## 3. Script A — Seed From Staging Snapshot
Command:

```bash
yarn db:seed:from-staging
```

Flow:
1. Connect to staging MongoDB using env vars
2. Export selected collections (or full dump)
3. Sanitize sensitive data:
   - emails => fake/demo emails
n   - phones => fake numbers
   - remove tokens/sessions/logs
   - reset passwords to known demo password if needed
4. Convert snapshot into reusable seed files inside `/seeds/realistic`
5. Reset local DB
6. Run migrations
7. Seed local DB from generated realistic seeds
8. Print summary counts by collection

Requirements:
- Idempotent
- Safe for repeated local use
- Never modify staging data
- Use read-only operations on staging

---

## 4. Script B — Pull Direct Data From Staging
Command:

```bash
yarn db:pull:staging
```

Flow:
1. Connect to staging MongoDB
2. Dump data locally
3. Restore into local database named `travel_vn_debug`
4. Run migrations against debug DB if needed
5. Print success message + DB name

Requirements:
- Must restore to separate DB (not overwrite default local DB)
- Intended for debugging real staging issues
- Never write to staging

---

## 5. Standard Local Seed Command
Command:

```bash
yarn db:seed
```

Flow:
1. Reset local DB
2. Run migrations
3. Seed from `/seeds/base` or `/seeds/realistic`

---

## 6. Reset Command
Command:

```bash
yarn db:reset
```

Drops local dev DB safely and recreates empty DB.

---

## 7. Package.json Scripts
Add scripts like:

```json
{
  "db:migrate": "...",
  "db:migrate:down": "...",
  "db:migrate:create": "...",
  "db:seed": "...",
  "db:seed:from-staging": "...",
  "db:pull:staging": "...",
  "db:reset": "..."
}
```

---

## 8. Environment Variables
Use `.env` as the local development environment file (IMPORTANT: this project uses `.env` for local dev, not `.env.local`). Also support:

```env
MONGO_URI_LOCAL= # stored in .env
MONGO_URI_STAGING=
MONGO_DB_LOCAL=travel_vn_local
MONGO_DB_DEBUG=travel_vn_debug
```

---

## 9. Safety Rules
- Never write/update/delete on staging
- Require confirmation if command could overwrite local DB
- Strong error handling
- Clear terminal logs

---

## 10. Deliverables
Please generate:
1. Actual scripts/files
2. Updated `package.json`
3. README at `/docs/database-workflow.md`
4. Example usage commands
5. Explain any assumptions

---

## Preferred Quality Level
Code should be maintainable, modular, senior-level, and suitable for real production workflow.

