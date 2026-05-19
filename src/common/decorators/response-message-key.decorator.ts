import { SetMetadata } from '@nestjs/common';

export const RESPONSE_MESSAGE_KEY_METADATA = 'vnTours.responseMessageKey';

export const ResponseMessageKey = (key: string) =>
  SetMetadata(RESPONSE_MESSAGE_KEY_METADATA, key);
