export const RBAC_ROLE_CODES = [
  'super_admin',
  'admin',
  'editor',
  'guide',
  'viewer',
] as const;

export type RbacRoleCode = (typeof RBAC_ROLE_CODES)[number];

export const ADMIN_PORTAL_ROLE_CODES: readonly string[] = [
  ...RBAC_ROLE_CODES,
  'ADMIN',
];

export const RBAC_PERMISSIONS_METADATA_KEY = 'rbac.permissions';
