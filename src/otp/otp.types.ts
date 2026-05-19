export enum OtpPurpose {
  LOGIN = 'LOGIN',
  VERIFY_EMAIL = 'VERIFY_EMAIL',
  VERIFY_PHONE = 'VERIFY_PHONE',
  RESET_PASSWORD = 'RESET_PASSWORD',
}

export interface OtpRecord {
  purpose: OtpPurpose;

  target: string;
  code: string;
  issuedAt: string;
  expiresAt: string;
  attempts: number;
  maxAttempts: number;
  meta?: Record<string, unknown>;
}
