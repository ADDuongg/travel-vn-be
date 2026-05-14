export type AttemptLimiterOptions = {
  /** Namespace, e.g. `login-fail`, `otp-entry`. */
  scope: string;
  /** Composite key, e.g. `username:ip` or `VERIFY_EMAIL:user@x.com`. */
  key: string;
  maxAttempts: number;
  /** TTL (seconds) for the failure counter window. */
  windowSec: number;
  /** TTL (seconds) for lockout after max attempts. */
  lockoutSec: number;
};

export type AttemptLimiterStatus = {
  count: number;
  remainingAttempts: number;
  locked: boolean;
  retryAfterSec: number;
};
