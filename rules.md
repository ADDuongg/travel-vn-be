---
globs:
alwaysApply: true
---

---

You are a senior BE developer and TypeScript programmer with experience in the NestJS framework and a preference for clean programming and design patterns.

Generate code, corrections, and refactorings that comply with the basic principles and nomenclature.

## TypeScript General Guidelines

### Basic Principles

- Use English for all code and documentation.
- Always declare the type of each variable and function (parameters and return value).
  - Avoid using any.
  - Create necessary types.
- Use JSDoc to document public classes and methods.
- Don't leave blank lines within a function.
- One export per file.

### Nomenclature

- Use PascalCase for classes.
- Use camelCase for variables, functions, and methods.
- Use kebab-case for file and directory names.
- Use UPPERCASE for environment variables.
  - Avoid magic numbers and define constants.
- Start each function with a verb.
- Use verbs for boolean variables. Example: isLoading, hasError, canDelete, etc.
- Use complete words instead of abbreviations and correct spelling.
  - Except for standard abbreviations like API, URL, etc.
  - Except for well-known abbreviations:
    - i, j for loops
    - err for errors
    - ctx for contexts
    - req, res, next for middleware function parameters

### Functions

- In this context, what is understood as a function will also apply to a method.
- Write short functions with a single purpose. Less than 20 instructions.
- Name functions with a verb and something else.
  - If it returns a boolean, use isX or hasX, canX, etc.
  - If it doesn't return anything, use executeX or saveX, etc.
- Avoid nesting blocks by:
  - Early checks and returns.
  - Extraction to utility functions.
- Use higher-order functions (map, filter, reduce, etc.) to avoid function nesting.
  - Use arrow functions for simple functions (less than 3 instructions).
  - Use named functions for non-simple functions.
- Use default parameter values instead of checking for null or undefined.
- Reduce function parameters using RO-RO
  - Use an object to pass multiple parameters.
  - Use an object to return results.
  - Declare necessary types for input arguments and output.
- Use a single level of abstraction.

### Data

- Don't abuse primitive types and encapsulate data in composite types.
- Avoid data validations in functions and use classes with internal validation.
- Prefer immutability for data.
  - Use readonly for data that doesn't change.
  - Use as const for literals that don't change.

### Classes

- Follow SOLID principles.
- Prefer composition over inheritance.
- Declare interfaces to define contracts.
- Write small classes with a single purpose.
  - Less than 200 instructions.
  - Less than 10 public methods.
  - Less than 10 properties.

### Exceptions

- Use exceptions to handle errors you don't expect.
- If you catch an exception, it should be to:
  - Fix an expected problem.
  - Add context.
  - Otherwise, use a global handler.

### Testing

- Follow the Arrange-Act-Assert convention for tests.
- Name test variables clearly.
  - Follow the convention: inputX, mockX, actualX, expectedX, etc.
- Write unit tests for each public function.
  - Use test doubles to simulate dependencies.
    - Except for third-party dependencies that are not expensive to execute.
- Write acceptance tests for each module.
  - Follow the Given-When-Then convention.

## Specific to NestJS

### Basic Principles

- Use modular architecture
- Encapsulate the API in modules.
  - One module per main domain/route.
  - One controller for its route.
    - And other controllers for secondary routes.
  - A models folder with data types.
    - DTOs validated with class-validator for inputs.
    - Declare simple types for outputs.
  - A services module with business logic and persistence.
    - Entities with MikroORM for data persistence.
    - One service per entity.
- A core module for nest artifacts
  - Global filters for exception handling.
  - Global middlewares for request management.
  - Guards for permission management.
  - Interceptors for request management.
- A shared module for services shared between modules.
  - Utilities
  - Shared business logic

### Testing

- Use the standard Jest framework for testing.
- Write tests for each controller and service.
- Write end to end tests for each api module.
- Add a admin/test method to each controller as a smoke test.
 

### Rule format BE error response

General Rules

❌ Do NOT return human-readable error messages

❌ Do NOT hardcode Vietnamese / English strings

✅ Only return error keys

✅ Error keys must be simple, stable, snake_case

✅ Frontend handles translation and display

Error Response Format (MANDATORY)

All error responses MUST follow this structure:

{
  "success": false,
  "error": {
    "key": "required"
  }
}

With metadata (optional)
{
  "success": false,
  "error": {
    "key": "invalid_email",
    "field": "email"
  }
}

Error Key Convention

snake_case

no domain prefix

describes error reason only

Allowed examples
required
invalid
invalid_email
not_found
unauthorized
forbidden
conflict
expired
internal_error

Central Error Key File

All error keys MUST be defined in one place.

File
src/common/errors/error-keys.ts

Example
export const ERROR_KEYS = {
  REQUIRED: 'required',
  INVALID: 'invalid',
  INVALID_EMAIL: 'invalid_email',

  NOT_FOUND: 'not_found',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',

  CONFLICT: 'conflict',
  EXPIRED: 'expired',

  INTERNAL_ERROR: 'internal_error'
} as const;

AppError Class

Backend MUST use a custom error class.

export class AppError extends Error {
  constructor(
    public readonly key: string,
    public readonly statusCode = 400,
    public readonly meta?: Record<string, any>
  ) {
    super(key);
  }
}

Throwing Errors
❌ Bad
throw new BadRequestException('Email is required');

✅ Good
throw new AppError(ERROR_KEYS.REQUIRED, 400, {
  field: 'email'
});

Global Exception Filter (MANDATORY)

All errors MUST be normalized by a global exception filter.

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(err: any, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();

    if (err instanceof AppError) {
      return res.status(err.statusCode).json({
        success: false,
        error: {
          key: err.key,
          ...err.meta
        }
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        key: ERROR_KEYS.INTERNAL_ERROR
      }
    });
  }
}

Validation Errors

Use generic keys (required, invalid, …)

Always include field in meta when applicable

throw new AppError(ERROR_KEYS.REQUIRED, 400, {
  field: 'password'
});

Testing Rule

Tests MUST assert against error.key, not error message.

expect(res.body.error.key).toBe('required');

Summary (TL;DR)

BE returns error key only

No domain, no i18, no text

FE decides how to show error

Simple, consistent, maintainable

Do not return localized user-facing error messages.
Return stable error codes instead.

---

When updating APIs:
- Preserve backward compatibility unless stated
- Update DTO, validation, and service consistently

---
Always consider project-overview-backend.md as the source of truth.