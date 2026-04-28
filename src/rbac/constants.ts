/** Canonical role codes stored as User.roles[] strings (lowercase snake_case preferred). */
export const RBAC_ROLE_CODES = [
  'super_admin',
  'admin',
  'editor',
  'guide',
  'viewer',
] as const;

export type RbacRoleCode = (typeof RBAC_ROLE_CODES)[number];

/** Roles that may access `/api/v1/admin/*` (beyond `isSuperAdmin`). */
export const ADMIN_PORTAL_ROLE_CODES: readonly string[] = [
  ...RBAC_ROLE_CODES,
  'ADMIN', // legacy string seen in codebase
];

/** Reflector metadata key for `@RequirePermissions` (RBAC_PLANS §6). */
export const RBAC_PERMISSIONS_METADATA_KEY = 'rbac.permissions';
