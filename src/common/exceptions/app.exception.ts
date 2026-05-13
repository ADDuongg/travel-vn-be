/**
 * Base application exception. Handled by {@link HttpExceptionFilter} with a stable JSON shape.
 */
export class AppException extends Error {
  readonly statusCode: number;
  readonly errorCode?: string;
  readonly messageKey?: string;

  constructor(
    message: string,
    statusCode: number,
    errorCode?: string,
    messageKey?: string,
  ) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.messageKey = messageKey;
    Error.captureStackTrace?.(this, new.target);
  }
}
