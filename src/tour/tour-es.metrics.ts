import { makeCounterProvider } from '@willsoto/nestjs-prometheus';

/** Prometheus metric names (must match @InjectMetric / makeCounterProvider `name`). */
export const ES_FALLBACK_TOTAL = 'es_fallback_total';
export const ES_SYNC_SUCCESS_TOTAL = 'es_sync_success_total';
export const ES_SYNC_FAILED_TOTAL = 'es_sync_failed_total';

export const tourEsCounterProviders = [
  makeCounterProvider({
    name: ES_FALLBACK_TOTAL,
    help: 'Tour list queries served from MongoDB instead of Elasticsearch',
    labelNames: ['reason'],
  }),
  makeCounterProvider({
    name: ES_SYNC_SUCCESS_TOTAL,
    help: 'Tour Elasticsearch sync jobs completed successfully',
    labelNames: ['operation'],
  }),
  makeCounterProvider({
    name: ES_SYNC_FAILED_TOTAL,
    help: 'Tour Elasticsearch sync jobs failed after all retries',
    labelNames: ['operation'],
  }),
];
