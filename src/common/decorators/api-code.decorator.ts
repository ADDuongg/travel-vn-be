import { SetMetadata } from '@nestjs/common';

export const API_CODE_METADATA_KEY = 'apiCode';

export const ApiCode = (code: string) =>
  SetMetadata(API_CODE_METADATA_KEY, code);
