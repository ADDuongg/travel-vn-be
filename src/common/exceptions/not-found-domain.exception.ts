import { COMMON_I18N_KEYS } from '../i18n/keys';
import { DomainException } from './domain.exception';

export class NotFoundDomainException extends DomainException {
  constructor(
    message = 'Resource not found',
    errorCode = 'NOT_FOUND',
    messageKey?: string,
  ) {
    super(message, 404, errorCode, messageKey ?? COMMON_I18N_KEYS.NOT_FOUND);
  }
}
