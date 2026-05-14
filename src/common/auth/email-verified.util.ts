/** Role `code` values that may use portal/admin APIs without a verified email (JWT `roles`). */
const EMAIL_VERIFY_BYPASS_ROLE_CODES = new Set(['admin', 'super_admin']);

/**
 * JWT claim `isEmailVerified`: `false` = must verify. `true` or omitted = allowed (legacy users had no field).
 */
export function isJwtEmailVerifiedEffective(
  value: boolean | undefined,
): boolean {
  return value !== false;
}

/** Staff with `admin` / `super_admin` role, or `isSuperAdmin` flag, skip email-verified gate. */
export function bypassesEmailVerificationGate(input: {
  roles?: string[];
  isSuperAdmin?: boolean;
}): boolean {
  if (input.isSuperAdmin === true || input.roles?.includes('admin')) {
    return true;
  }
  if (!Array.isArray(input.roles)) {
    return false;
  }
  return input.roles.some((r) =>
    EMAIL_VERIFY_BYPASS_ROLE_CODES.has(String(r).toLowerCase()),
  );
}
