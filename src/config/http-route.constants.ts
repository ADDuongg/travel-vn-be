export const GLOBAL_HTTP_API_PREFIX = 'api/v1';

export const GLOBAL_HTTP_API_PREFIX_PATH = `/${GLOBAL_HTTP_API_PREFIX}`;

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
