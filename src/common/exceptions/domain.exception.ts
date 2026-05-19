import { COMMON_I18N_KEYS } from '../i18n/keys';
import { AppException } from './app.exception';

export class DomainException extends AppException {
  constructor(
    message: string,
    statusCode = 400,
    errorCode?: string,
    messageKey?: string,
  ) {
    super(
      message,
      statusCode,
      errorCode ?? 'DOMAIN_ERROR',
      messageKey ?? COMMON_I18N_KEYS.DOMAIN_ERROR,
    );
  }
}
