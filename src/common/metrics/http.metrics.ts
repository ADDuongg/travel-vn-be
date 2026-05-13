import { makeHistogramProvider } from '@willsoto/nestjs-prometheus';

export const HTTP_REQUEST_DURATION_SECONDS = 'http_request_duration_seconds';

export const httpRequestDurationHistogramProvider = makeHistogramProvider({
  name: HTTP_REQUEST_DURATION_SECONDS,
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_class'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

export const httpMetricsProviders = [httpRequestDurationHistogramProvider];
