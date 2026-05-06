import { randomUUID } from 'node:crypto';

export interface NotificationJobMeta {
  requestId?: string;
  eventId: string;
  eventName: string;
  occurredAt: string;
  source: string;
}

export interface NotificationJobEnvelope<TPayload> extends NotificationJobMeta {
  payload: TPayload;
}

export function createNotificationJobEnvelope<TPayload>(params: {
  payload: TPayload;
  eventName: string;
  source: string;
  requestId?: string;
  eventId?: string;
  occurredAt?: string;
}): NotificationJobEnvelope<TPayload> {
  return {
    payload: params.payload,
    eventId: params.eventId ?? randomUUID(),
    eventName: params.eventName,
    occurredAt: params.occurredAt ?? new Date().toISOString(),
    requestId: params.requestId,
    source: params.source,
  };
}

export function isNotificationJobEnvelope<TPayload>(
  value: unknown,
): value is NotificationJobEnvelope<TPayload> {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    'payload' in candidate &&
    typeof candidate.eventId === 'string' &&
    typeof candidate.eventName === 'string' &&
    typeof candidate.occurredAt === 'string' &&
    typeof candidate.source === 'string'
  );
}

export function normalizeNotificationJobData<TPayload>(
  data: unknown,
  defaults: {
    eventName: string;
    source: string;
  },
): NotificationJobEnvelope<TPayload> {
  if (isNotificationJobEnvelope<TPayload>(data)) return data;
  return createNotificationJobEnvelope({
    payload: data as TPayload,
    eventName: defaults.eventName,
    source: defaults.source,
  });
}
