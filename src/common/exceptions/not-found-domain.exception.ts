import { DomainException } from './domain.exception';

export class NotFoundDomainException extends DomainException {
  constructor(message = 'Resource not found', errorCode = 'NOT_FOUND') {
    super(message, 404, errorCode);
  }
}
