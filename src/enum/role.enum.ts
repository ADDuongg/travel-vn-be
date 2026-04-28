/**
 * Canonical role strings persisted on users and JWT payloads.
 * Use these with @Roles() instead of string literals for refactor safety.
 */
export enum Role {
  USER = 'user',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}
