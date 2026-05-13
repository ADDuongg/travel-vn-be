import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_MESSAGE_KEY_METADATA } from 'src/common/decorators/response-message-key.decorator';
import { COMMON_I18N_KEYS } from 'src/common/i18n/keys';
import { isI18nSuccessEnvelope } from 'src/common/i18n/success-envelope';

@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse();
    const handler = context.getHandler();

    return next.handle().pipe(
      map((data: unknown) => {
        let payload: unknown = data;
        let message = 'success';
        let messageKey =
          this.reflector.get<string>(RESPONSE_MESSAGE_KEY_METADATA, handler) ??
          COMMON_I18N_KEYS.SUCCESS;

        if (isI18nSuccessEnvelope(data)) {
          payload = data.data;
          message = data.message;
          messageKey = data.messageKey;
        }

        return {
          statusCode: response.statusCode,
          status: true,
          timestamp: new Date().toISOString(),
          data: payload,
          message,
          messageKey,
        };
      }),
    );
  }
}
