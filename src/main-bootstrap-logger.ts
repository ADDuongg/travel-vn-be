import pino from 'pino';
import { resolveAppVersion } from './config/app-version';

const LOG_LEVELS = [
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
] as const;

function resolveBootstrapLogLevel(
  raw: string | undefined,
): (typeof LOG_LEVELS)[number] | 'silent' {
  if (raw === 'silent') return 'silent';
  if (LOG_LEVELS.includes(raw as (typeof LOG_LEVELS)[number])) {
    return raw as (typeof LOG_LEVELS)[number];
  }
  return 'info';
}

export const bootstrapLogger = pino({
  level: resolveBootstrapLogLevel(process.env.LOG_LEVEL),
  base: {
    phase: 'bootstrap',
    service: process.env.SERVICE_NAME?.trim() || 'tours-api',
    environment: process.env.NODE_ENV ?? 'development',
    version: resolveAppVersion(),
  },
});
