import { SetMetadata } from '@nestjs/common';

/** Metadata key for future granular RBAC (api_role / api_permission). */
export const API_CODE_METADATA_KEY = 'apiCode';

/**
 * Annotate a route handler with a stable permission code for future ApiPermissionGuard.
 * Does nothing until enforcement is wired; safe to adopt incrementally.
 */
export const ApiCode = (code: string) =>
  SetMetadata(API_CODE_METADATA_KEY, code);
