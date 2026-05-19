const EMAIL_VERIFY_BYPASS_ROLE_CODES = new Set(['admin', 'super_admin']);

export function isJwtEmailVerifiedEffective(
  value: boolean | undefined,
): boolean {
  return value !== false;
}

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
