import { AppException } from './app.exception';

/** Business / domain rule violation (client-safe message). */
export class DomainException extends AppException {
  constructor(message: string, statusCode = 400, errorCode?: string) {
    super(message, statusCode, errorCode ?? 'DOMAIN_ERROR');
  }
}
