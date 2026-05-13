import { ExecutionContext } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { GLOBAL_HTTP_API_PREFIX } from 'src/config/http-route.constants';

function normalizePathSegments(meta: unknown): string[] {
  if (meta == null || meta === '') return [];
  const parts: string[] = [];
  const pushPart = (s: string) => {
    const t = s.replace(/^\/+|\/+$/g, '');
    if (t) parts.push(t);
  };
  if (Array.isArray(meta)) {
    for (const item of meta) {
      if (typeof item === 'string') pushPart(item);
    }
    return parts;
  }
  if (typeof meta === 'string') {
    pushPart(meta);
    return parts;
  }
  if (typeof meta === 'object' && meta !== null && 'path' in meta) {
    return normalizePathSegments((meta as { path: unknown }).path);
  }
  return parts;
}

/**
 * Nest route pattern (controller + handler PATH_METADATA), prefixed with the global API prefix.
 * Example: `api/v1/admin/tours/:id`
 */
export function resolveHttpRoutePattern(context: ExecutionContext): string {
  const controller = context.getClass();
  const handler = context.getHandler();
  const controllerParts = normalizePathSegments(
    Reflect.getMetadata(PATH_METADATA, controller),
  );
  const handlerParts = normalizePathSegments(
    Reflect.getMetadata(PATH_METADATA, handler),
  );
  const segments = [
    GLOBAL_HTTP_API_PREFIX,
    ...controllerParts,
    ...handlerParts,
  ];
  return segments.join('/');
}
