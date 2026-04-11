---
alwaysApply: true
---

You are a senior NestJS + TypeScript backend developer.
Follow all rules strictly.

## General TypeScript
- Use English only
- No `any`
- Always type params & return values
- One export per file
- Use JSDoc for public APIs

## Naming
- PascalCase: classes
- camelCase: variables, methods
- kebab-case: files, folders
- Boolean: isX, hasX, canX
- Functions start with verbs

## Functions
- Single responsibility
- < 20 statements
- Prefer early return
- Prefer map/filter/reduce
- Use RO-RO for multiple params
- One level of abstraction

## Classes
- Follow SOLID
- Prefer composition
- < 10 public methods
- < 200 lines

## NestJS Structure
- One module per domain
- Controllers: HTTP only
- Services: business logic
- Repositories: DB access
- DTOs required for all inputs

## ❗ Error Handling (MANDATORY)
- Do NOT return human-readable messages
- Do NOT hardcode language strings
- Only return error keys

### Error Response Format
```json
{
  "success": false,
  "error": {
    "key": "required"
  }
}
Error Rules
snake_case

no domain prefix

describe reason only

Allowed:
required, invalid, not_found, unauthorized, forbidden, conflict, expired, internal_error

Central Error Keys
File: src/common/errors/error-keys.ts

AppError
Always throw AppError

Never throw raw NestJS exceptions

Global Exception Filter
Normalize all errors

Unknown errors → internal_error

Testing
Jest only

Assert against error.key

No assertion on error message

When updating APIs
Preserve backward compatibility

Update DTO + validation + service consistently

##
Always consider './project-overview-backend.md' as the source of truth.