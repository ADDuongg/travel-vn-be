import { COMMON_I18N_KEYS } from '../i18n/keys';
import { DomainException } from './domain.exception';

export class ForbiddenDomainException extends DomainException {
  constructor(
    message = 'Forbidden',
    errorCode = 'FORBIDDEN',
    messageKey?: string,
  ) {
    super(message, 403, errorCode, messageKey ?? COMMON_I18N_KEYS.FORBIDDEN);
  }
}
