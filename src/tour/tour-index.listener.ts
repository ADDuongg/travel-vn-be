import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { normalizeDomainEventEnvelope } from 'src/common/events/domain-event';
import {
  TOUR_INDEX_SYNC_EVENT,
  TourIndexSyncPayload,
} from './tour-index.constants';
import { TourSearchService } from './tour-search.service';
import { TourIndexQueueService } from './tour-index.queue';

@Injectable()
export class TourIndexListener {
  constructor(
    private readonly tourSearch: TourSearchService,
    private readonly tourIndexQueue: TourIndexQueueService,
  ) {}

  @OnEvent(TOUR_INDEX_SYNC_EVENT)
  async handleTourIndexSync(event: unknown): Promise<void> {
    const normalized = normalizeDomainEventEnvelope<TourIndexSyncPayload>({
      event,
      expectedEventName: TOUR_INDEX_SYNC_EVENT,
      source: TourIndexListener.name,
      legacyPayloadFactory: (legacyEvent) =>
        legacyEvent as TourIndexSyncPayload,
    });
    const payload = normalized.payload;
    if (!this.tourSearch.isUsable()) return;
    await this.tourIndexQueue.enqueue(payload.tourId, 'rating_recalc', {
      requestId: payload.requestId ?? normalized.requestId,
      eventId: payload.eventId ?? normalized.eventId,
    });
  }
}
