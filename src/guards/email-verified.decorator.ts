import { SetMetadata } from '@nestjs/common';

export const SKIP_EMAIL_VERIFIED_KEY = 'skipEmailVerified';

/** Skip {@link EmailVerifiedGuard} for this route (e.g. public or special cases). */
export const SkipEmailVerified = () =>
  SetMetadata(SKIP_EMAIL_VERIFIED_KEY, true);
