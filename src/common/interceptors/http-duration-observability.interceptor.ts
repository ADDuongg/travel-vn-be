import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { Observable } from 'rxjs';
import { Request, Response } from 'express';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import type { Histogram } from 'prom-client';
import { shouldSkipHttpDurationObservability } from 'src/config/http-route.constants';
import { CorrelationContextService } from '../correlation/correlation-context.service';
import { resolveHttpRoutePattern } from '../http/resolve-http-route';
import { HTTP_REQUEST_DURATION_SECONDS } from '../metrics/http.metrics';

function httpStatusClass(code: number): string {
  if (code >= 500) return '5xx';
  if (code >= 400) return '4xx';
  if (code >= 300) return '3xx';
  if (code >= 200) return '2xx';
  return '1xx';
}

@Injectable()
export class HttpDurationObservabilityInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric(HTTP_REQUEST_DURATION_SECONDS)
    private readonly httpRequestDuration: Histogram<string>,
    private readonly logger: Logger,
    private readonly correlationContext: CorrelationContextService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    if (shouldSkipHttpDurationObservability(req.path)) {
      return next.handle();
    }

    const started = process.hrtime.bigint();
    let recorded = false;
    const routePattern = resolveHttpRoutePattern(context);
    const snapshot = this.correlationContext.getStore();

    const record = () => {
      if (recorded) return;
      recorded = true;
      const durationNs = process.hrtime.bigint() - started;
      const durationMs = Math.round(Number(durationNs) / 1e6);
      const durationSec = Number(durationNs) / 1e9;
      const statusCode = res.statusCode || 0;
      const statusClass = httpStatusClass(statusCode);

      this.httpRequestDuration.observe(
        {
          method: req.method,
          route: routePattern,
          status_class: statusClass,
        },
        durationSec,
      );

      this.logger.log({
        msg: 'http_request_completed',
        httpRoute: routePattern,
        method: req.method,
        statusCode,
        durationMs,
        ...(snapshot?.requestId ? { requestId: snapshot.requestId } : {}),
      });
    };

    res.once('finish', record);

    return next.handle();
  }
}
