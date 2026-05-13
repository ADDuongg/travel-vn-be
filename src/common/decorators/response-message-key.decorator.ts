import { SetMetadata } from '@nestjs/common';

export const RESPONSE_MESSAGE_KEY_METADATA = 'vnTours.responseMessageKey';

/** Sets default success `messageKey` for this handler (FE i18n). */
export const ResponseMessageKey = (key: string) =>
  SetMetadata(RESPONSE_MESSAGE_KEY_METADATA, key);
