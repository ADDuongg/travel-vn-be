import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { REQUEST_ID_HEADER } from 'src/common/middleware/correlation-id.middleware';
import { AppException } from 'src/common/exceptions';

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

    if (exception instanceof AppException) {
      status = exception.statusCode;
      message = exception.message;
      errorCode = exception.errorCode;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'object' && res !== null) {
        if (Array.isArray((res as Record<string, unknown>).message)) {
          message = ((res as Record<string, unknown>).message as string[]).join(
            ', ',
          );
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
      });
    }

    const body: Record<string, unknown> = {
      statusCode: status,
      status: false,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: safeClientMessage,
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
