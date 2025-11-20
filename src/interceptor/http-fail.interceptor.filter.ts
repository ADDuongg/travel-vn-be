import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = 500;
    let message = 'Internal server error';
    console.log('Request info:', {
      method: request.method,
      url: request.url,
      headers: request.headers,
      body: request.body,
      query: request.query,
    });

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

    console.error('🔥 Exception caught:', {
      status,
      message,
      stack: exception.stack,
      response: exception.response,
    });

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
