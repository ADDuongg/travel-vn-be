/**
 * Base application exception. Handled by {@link HttpExceptionFilter} with a stable JSON shape.
 */
export class AppException extends Error {
  readonly statusCode: number;
  readonly errorCode?: string;

  constructor(message: string, statusCode: number, errorCode?: string) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    Error.captureStackTrace?.(this, new.target);
  }
}
