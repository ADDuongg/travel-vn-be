import { randomUUID } from 'node:crypto';

export interface DomainEventMeta {
  eventId: string;
  eventName: string;
  occurredAt: string;
  requestId?: string;
  source: string;
}

export interface DomainEventEnvelope<TPayload> extends DomainEventMeta {
  payload: TPayload;
}

export function createDomainEventEnvelope<TPayload>(params: {
  eventName: string;
  source: string;
  payload: TPayload;
  requestId?: string;
  eventId?: string;
  occurredAt?: string;
}): DomainEventEnvelope<TPayload> {
  return {
    eventId: params.eventId ?? randomUUID(),
    eventName: params.eventName,
    occurredAt: params.occurredAt ?? new Date().toISOString(),
    requestId: params.requestId,
    source: params.source,
    payload: params.payload,
  };
}

export function isDomainEventEnvelope<TPayload>(
  value: unknown,
): value is DomainEventEnvelope<TPayload> {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.eventId === 'string' &&
    typeof candidate.eventName === 'string' &&
    typeof candidate.occurredAt === 'string' &&
    typeof candidate.source === 'string' &&
    'payload' in candidate
  );
}

export function normalizeDomainEventEnvelope<TPayload>(params: {
  event: unknown;
  expectedEventName: string;
  source: string;
  legacyPayloadFactory: (event: unknown) => TPayload;
}): DomainEventEnvelope<TPayload> {
  if (isDomainEventEnvelope<TPayload>(params.event)) {
    return params.event;
  }

  return createDomainEventEnvelope({
    eventName: params.expectedEventName,
    source: params.source,
    payload: params.legacyPayloadFactory(params.event),
  });
}
