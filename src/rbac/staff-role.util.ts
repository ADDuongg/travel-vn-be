import { RBAC_ROLE_CODES } from './constants';

export function hasPortalStaffRole(roles: string[] | undefined): boolean {
  if (!roles?.length) return false;
  const canon = RBAC_ROLE_CODES.map((r) => r.toLowerCase());
  const set = new Set(canon);
  return roles.some((raw) => {
    const k = String(raw).trim().toLowerCase();
    return set.has(k);
  });
}
