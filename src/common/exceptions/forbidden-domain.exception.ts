import { DomainException } from './domain.exception';

export class ForbiddenDomainException extends DomainException {
  constructor(message = 'Forbidden', errorCode = 'FORBIDDEN') {
    super(message, 403, errorCode);
  }
}
