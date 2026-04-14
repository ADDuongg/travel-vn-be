---
name: Database Workflow Implementation
overview: Implement a complete database workflow for local development including migrations (migrate-mongo), seed from staging snapshot, pull staging data for debugging, standard seeding, and DB reset -- all with TypeScript scripts, safety checks, and clear documentation.
todos:
  - id: setup-deps
    content: Install migrate-mongo + dotenv as devDependencies, add npm scripts to package.json
    status: completed
  - id: env-setup
    content: Add MONGO_URI_LOCAL, MONGO_URI_STAGING, MONGO_DB_LOCAL, MONGO_DB_DEBUG to .env and env.validation.ts (optional), update .gitignore
    status: completed
  - id: folder-structure
    content: 'Create directory structure: scripts/database/lib/, seeds/base/, seeds/realistic/, backups/, migrations/ with .gitkeep files'
    status: completed
  - id: lib-modules
    content: 'Implement shared libs: config.ts (env loader + URI parser), logger.ts (colored logs), confirm.ts (readline prompt), mongo-tools.ts (mongodump/mongorestore wrappers)'
    status: completed
  - id: migrate-mongo-config
    content: Create migrate-mongo-config.js at project root, configured to read MONGO_URI_LOCAL from .env
    status: completed
  - id: migration-scripts
    content: Create migrate.ts and migrate-down.ts scripts (wrappers around migrate-mongo CLI)
    status: completed
  - id: reset-script
    content: Implement reset.ts - drop local DB with confirmation prompt
    status: completed
  - id: sanitize-script
    content: Implement sanitize.ts - sanitize User collection (emails, phones, passwords), drop token/session collections
    status: completed
  - id: seed-from-staging
    content: 'Implement seed-from-staging.ts - full flow: mongodump staging -> sanitize -> reset local -> migrate -> mongorestore'
    status: completed
  - id: pull-staging
    content: Implement pull-staging.ts - mongodump staging -> mongorestore to travel_vn_debug DB
    status: completed
  - id: seed-script
    content: Implement seed.ts - reset + migrate + seed from base or realistic data
    status: completed
  - id: documentation
    content: Create docs/database-workflow.md with full usage guide, examples, and safety notes
    status: completed
isProject: false
---

# Database Workflow Implementation Plan

## Overview

Build a production-grade database workflow with 6 main commands: `db:migrate`, `db:seed`, `db:seed:from-staging`, `db:pull:staging`, `db:reset`, and `db:migrate:create`. Uses `migrate-mongo` for migrations, `mongodump`/`mongorestore` for staging data, and TypeScript scripts for orchestration.

---

## Prerequisites (manual steps by developer)

- Install MongoDB Database Tools on Mac: `brew install mongodb-database-tools`
- Install `migrate-mongo`: added to `devDependencies`
- Open SSH tunnel to staging before running staging-related commands:

```bash
  ssh -N -L 27117:127.0.0.1:27017 user@VPS_IP


```

(Using port `27117` on local to avoid conflict with local Mongo on `27017`)

---

## New Environment Variables

Add to `[.env](.env)` (and document in `.env.docker.example`):

```env
# Database workflow scripts (NOT used by NestJS app, only by scripts)
MONGO_URI_LOCAL=mongodb://duongnv:Duong%4088999@localhost:27017/travel_vn_local?authSource=admin
MONGO_URI_STAGING=mongodb://STAGING_USER:STAGING_PASS@localhost:27117/travel-vn?authSource=admin
MONGO_DB_LOCAL=travel_vn_local
MONGO_DB_DEBUG=travel_vn_debug
```

Key notes:

- `MONGO_URI_LOCAL` uses `localhost` (host machine), not `mongo` (Docker network)
- `MONGO_URI_STAGING` connects via SSH tunnel on port `27117`
- Existing `DB_URI` stays untouched (used by NestJS app inside Docker)

---

## Folder Structure

```text
scripts/database/
  lib/
    config.ts          # Load env vars, parse MongoDB URIs, shared constants
    logger.ts          # Colored terminal logger (chalk-free, uses ANSI codes)
    confirm.ts         # Interactive confirmation prompt (readline)
    mongo-tools.ts     # Wrappers for mongodump/mongorestore CLI calls
  migrate.ts           # Run pending migrations (via migrate-mongo)
  migrate-down.ts      # Rollback last migration
  migrate-create.ts    # Create new migration file
  seed.ts              # Standard local seed (reset + migrate + seed base data)
  seed-from-staging.ts # Seed from staging snapshot (dump + sanitize + seed)
  pull-staging.ts      # Pull staging data into debug DB
  sanitize.ts          # Sanitize user data (emails, passwords, phones)
  reset.ts             # Drop local dev DB

seeds/
  base/                # Minimal seed data for development (manually curated)
    .gitkeep
  realistic/           # Auto-generated from staging snapshots (gitignored)
    .gitkeep

backups/               # Staging dumps stored temporarily (gitignored)
  .gitkeep

migrations/            # migrate-mongo migration files
  .gitkeep

migrate-mongo-config.js  # migrate-mongo configuration (reads from .env)

docs/database-workflow.md  # Full documentation
```

---

## Migration System (migrate-mongo)

### Configuration: `[migrate-mongo-config.js](migrate-mongo-config.js)`

- Reads `MONGO_URI_LOCAL` from `.env` using `dotenv`
- Points `migrationsDir` to `./migrations`
- Uses `changelog` collection to track applied migrations

### Commands

| Script              | Command                       | What it does                                    |
| ------------------- | ----------------------------- | ----------------------------------------------- |
| `db:migrate`        | `migrate-mongo up`            | Apply all pending migrations                    |
| `db:migrate:down`   | `migrate-mongo down`          | Rollback last migration                         |
| `db:migrate:create` | `migrate-mongo create <name>` | Create new migration file with descriptive name |

Migration filenames: timestamp + developer-provided name, e.g. `20260413120000-add-slug-to-hotels.js`

---

## Script Details

### Script A: `seed-from-staging.ts` (`npm run db:seed:from-staging`)

```mermaid
flowchart TD
  A[Start] --> B[Load env vars]
  B --> C[Confirm: will overwrite local DB]
  C --> D["mongodump from staging (read-only, via SSH tunnel)"]
  D --> E[Save dump to backups/staging-snapshot/]
  E --> F[Sanitize: process User collection dump]
  F --> G[Convert to seed files in seeds/realistic/]
  G --> H[Reset local DB]
  H --> I[Run migrations]
  I --> J["mongorestore sanitized data to local DB"]
  J --> K[Print summary: collection counts]
```

Sanitization (User collection only):

- Replace emails with `user-{index}@demo.local`
- Replace phone numbers with `0900000{index}`
- Reset passwords to bcrypt hash of `Demo@123`
- Drop collections entirely: `refreshtokens`, `idempotencies`, `notifications`

### Script B: `pull-staging.ts` (`npm run db:pull:staging`)

```mermaid
flowchart TD
  A[Start] --> B[Load env vars]
  B --> C[Confirm: will overwrite debug DB]
  C --> D["mongodump from staging (read-only)"]
  D --> E["mongorestore to travel_vn_debug (separate DB)"]
  E --> F[Run migrations against debug DB]
  F --> G["Print success + DB name (travel_vn_debug)"]
```

- Restores to `travel_vn_debug` DB, never touches `travel_vn_local`
- Raw staging data, no sanitization (for debugging real issues)

Never commit dump files

### Script C: `seed.ts` (`npm run db:seed`)

1. Reset local DB
2. Run migrations
3. Seed from `seeds/base/` (if files exist) or `seeds/realistic/` (if staging snapshot available)

### Script D: `reset.ts` (`npm run db:reset`)

1. Confirm prompt (safety)
2. Drop all collections in `travel_vn_local`
3. Print success message

---

## Package.json Scripts

```json
{
  "db:migrate": "migrate-mongo up",
  "db:migrate:down": "migrate-mongo down",
  "db:migrate:create": "migrate-mongo create",
  "db:seed": "ts-node scripts/database/seed.ts",
  "db:seed:from-staging": "ts-node scripts/database/seed-from-staging.ts",
  "db:pull:staging": "ts-node scripts/database/pull-staging.ts",
  "db:reset": "ts-node scripts/database/reset.ts"
}
```

---

## Dependencies to Install

- `migrate-mongo` (devDependency) -- MongoDB migration framework
- `dotenv` (devDependency) -- Load `.env` for standalone scripts (NestJS app uses `@nestjs/config`, but scripts run outside Nest)

---

## .gitignore Additions

```
/backups/
/seeds/realistic/
```

The `seeds/base/` and `migrations/` folders are committed to git.

---

## Safety Rules Built Into Every Script

- Staging connections are **read-only** (only `mongodump`, never `mongorestore` to staging URI)
- Confirmation prompt before any destructive local operation
- Strong error handling with `process.exit(1)` on failure
- Clear colored terminal logs with step numbers
- Staging URI validation: refuse to run `mongorestore` if target URI matches staging pattern

---

## Files to Create/Modify

**New files (13):**

- `scripts/database/lib/config.ts`
- `scripts/database/lib/logger.ts`
- `scripts/database/lib/confirm.ts`
- `scripts/database/lib/mongo-tools.ts`
- `scripts/database/migrate.ts`
- `scripts/database/migrate-down.ts`
- `scripts/database/seed.ts`
- `scripts/database/seed-from-staging.ts`
- `scripts/database/pull-staging.ts`
- `scripts/database/sanitize.ts`
- `scripts/database/reset.ts`
- `migrate-mongo-config.js`
- `docs/database-workflow.md`

**Modified files (3):**

- `[package.json](package.json)` -- add scripts + devDependencies
- `[.gitignore](.gitignore)` -- add `/backups/`, `/seeds/realistic/`
- `[.env](.env)` -- add `MONGO_URI_LOCAL`, `MONGO_URI_STAGING`, `MONGO_DB_LOCAL`, `MONGO_DB_DEBUG`

**Directory stubs (with .gitkeep):**

- `seeds/base/`
- `seeds/realistic/`
- `backups/`
- `migrations/`
