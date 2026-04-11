import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { REQUEST_ID_HEADER } from 'src/common/middleware/correlation-id.middleware';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = 500;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'object' && res !== null) {
        if (Array.isArray((res as any).message)) {
          message = (res as any).message.join(', ');
        } else {
          message = (res as any).message || exception.message;
        }
      } else {
        message = exception.message;
      }
    } else if (exception?.message) {
      message = exception.message;
    }

    const requestId = request.headers[REQUEST_ID_HEADER] as string | undefined;

    if (status >= 500) {
      this.logger.error({
        requestId,
        method: request.method,
        url: request.url,
        status,
        message,
        stack: exception?.stack,
      });
    } else {
      this.logger.warn({
        requestId,
        method: request.method,
        url: request.url,
        status,
        message,
      });
    }

    response.status(status).json({
      statusCode: status,
      status: false,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      data: null,
    });
  }
}
