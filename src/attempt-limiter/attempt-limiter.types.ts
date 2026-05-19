export type AttemptLimiterOptions = {
  scope: string;

  key: string;
  maxAttempts: number;

  windowSec: number;

  lockoutSec: number;
};

export type AttemptLimiterStatus = {
  count: number;
  remainingAttempts: number;
  locked: boolean;
  retryAfterSec: number;
};
