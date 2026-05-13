/**
 * Single source of truth for the Nest global HTTP API prefix (see main.ts setGlobalPrefix).
 * Paths in OpenAPI / logs should join this with controller + handler patterns.
 */
export const GLOBAL_HTTP_API_PREFIX = 'api/v1';

/** Prefix with leading slash, for Swagger and URL checks. */
export const GLOBAL_HTTP_API_PREFIX_PATH = `/${GLOBAL_HTTP_API_PREFIX}`;

/**
 * Paths that are excluded from GLOBAL_HTTP_API_PREFIX (same routes as main.ts exclude list).
 * Used to skip HTTP duration metrics/logs for noise-prone or infra endpoints.
 */
export function shouldSkipHttpDurationObservability(pathname: string): boolean {
  const path = pathname.split('?')[0] || '';
  if (path === '/' || path === '') return true;
  if (path === '/health' || path.startsWith('/health/')) return true;
  if (path === '/metrics' || path.startsWith('/metrics/')) return true;
  if (path === '/payments' || path.startsWith('/payments/')) return true;
  if (path === '/orders' || path.startsWith('/orders/')) return true;
  if (path === '/upload' || path.startsWith('/upload/')) return true;
  if (path === '/routers' || path.startsWith('/routers/')) return true;
  if (path === '/idempotency' || path.startsWith('/idempotency/')) return true;
  if (path === '/api/chat' || path.startsWith('/api/chat/')) return true;
  return false;
}
