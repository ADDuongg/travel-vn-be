import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { REQUEST_ID_HEADER } from 'src/common/middleware/correlation-id.middleware';
import { AppException } from 'src/common/exceptions';
import { COMMON_I18N_KEYS } from 'src/common/i18n/keys';

function defaultMessageKeyForHttpStatus(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return COMMON_I18N_KEYS.BAD_REQUEST;
    case HttpStatus.UNAUTHORIZED:
      return COMMON_I18N_KEYS.UNAUTHORIZED;
    case HttpStatus.FORBIDDEN:
      return COMMON_I18N_KEYS.FORBIDDEN;
    case HttpStatus.NOT_FOUND:
      return COMMON_I18N_KEYS.NOT_FOUND;
    case HttpStatus.CONFLICT:
      return COMMON_I18N_KEYS.CONFLICT;
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return COMMON_I18N_KEYS.VALIDATION_FAILED;
    case HttpStatus.TOO_MANY_REQUESTS:
      return COMMON_I18N_KEYS.RATE_LIMITED;
    default:
      if (status >= 500) return COMMON_I18N_KEYS.INTERNAL_ERROR;
      return COMMON_I18N_KEYS.BAD_REQUEST;
  }
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = request.headers[REQUEST_ID_HEADER] as string | undefined;

    let status = 500;
    let message = 'Internal server error';
    let errorCode: string | undefined;
    let messageKey: string | undefined;

    if (exception instanceof AppException) {
      status = exception.statusCode;
      message = exception.message;
      errorCode = exception.errorCode;
      messageKey = exception.messageKey;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'object' && res !== null) {
        if (Array.isArray((res as Record<string, unknown>).message)) {
          message = ((res as Record<string, unknown>).message as string[]).join(
            ', ',
          );
          messageKey = COMMON_I18N_KEYS.VALIDATION_FAILED;
        } else {
          message =
            ((res as Record<string, unknown>).message as string) ??
            exception.message;
        }
      } else {
        message = exception.message;
      }
    } else if (
      exception &&
      typeof exception === 'object' &&
      'message' in exception &&
      typeof (exception as Error).message === 'string'
    ) {
      message = (exception as Error).message;
    }

    const safeClientMessage = status >= 500 ? 'Internal server error' : message;

    if (status >= 500) {
      this.logger.error({
        requestId,
        method: request.method,
        url: request.url,
        status,
        message:
          exception instanceof AppException ? exception.message : message,
        stack: exception instanceof Error ? exception.stack : undefined,
        infraCause:
          exception &&
          typeof exception === 'object' &&
          'infraCause' in exception
            ? (exception as { infraCause?: unknown }).infraCause
            : undefined,
      });
    } else {
      this.logger.warn({
        requestId,
        method: request.method,
        url: request.url,
        status,
        message,
        errorCode,
        messageKey,
      });
    }

    if (!messageKey) {
      if (exception instanceof HttpException) {
        messageKey = defaultMessageKeyForHttpStatus(status);
      } else if (exception instanceof AppException) {
        messageKey =
          status >= 500
            ? COMMON_I18N_KEYS.INTERNAL_ERROR
            : COMMON_I18N_KEYS.DOMAIN_ERROR;
      } else if (status >= 500) {
        messageKey = COMMON_I18N_KEYS.INTERNAL_ERROR;
      } else {
        messageKey = COMMON_I18N_KEYS.DOMAIN_ERROR;
      }
    }

    const body: Record<string, unknown> = {
      statusCode: status,
      status: false,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: safeClientMessage,
      messageKey,
      data: null,
    };

    if (requestId) {
      body.requestId = requestId;
    }
    if (errorCode && status < 500) {
      body.errorCode = errorCode;
    }
    if (
      exception instanceof AppException &&
      exception.errorCode &&
      status >= 500
    ) {
      body.errorCode = exception.errorCode;
    }

    response.status(status).json(body);
  }
}
