import { Injectable, BadRequestException } from '@nestjs/common';
import {
  ForbiddenDomainException,
  NotFoundDomainException,
} from 'src/common/exceptions';
import { Types } from 'mongoose';
import { ReviewEntityType, ReviewStatus } from './schema/ewview.schema';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createDomainEventEnvelope } from 'src/common/events/domain-event';
import { CorrelationContextService } from 'src/common/correlation/correlation-context.service';
import {
  TOUR_INDEX_SYNC_EVENT,
  TourIndexSyncPayload,
} from 'src/tour/tour-index.constants';
import { ReviewRepository } from './review.repository';
import { ReviewTargetRepository } from './review-target.repository';

const MODERATION_UNSET = {
  approvedAt: '',
  approvedBy: '',
  rejectedAt: '',
  rejectedBy: '',
  rejectReason: '',
  hiddenAt: '',
  hiddenBy: '',
  hiddenReason: '',
} as const;

@Injectable()
export class ReviewService {
  constructor(
    private readonly reviewRepository: ReviewRepository,
    private readonly reviewTargetRepository: ReviewTargetRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly correlationContext: CorrelationContextService,
  ) {}

  async upsertReview(params: {
    entityType: ReviewEntityType;
    entityId: string;
    rating?: number;
    comment?: string;
    userId?: string;
    isAnonymous?: boolean;
  }) {
    const {
      entityType,
      entityId,
      rating,
      comment,
      userId,
      isAnonymous = false,
    } = params;

    if (!rating && !comment) {
      throw new BadRequestException('Rating or comment is required');
    }

    const filter: Record<string, unknown> = {
      entityType,
      entityId: new Types.ObjectId(entityId),
    };

    if (userId) {
      filter.userId = new Types.ObjectId(userId);
    } else {
      filter.isAnonymous = true;
    }

    const existing = await this.reviewRepository.findOneForUpsert(filter);

    if (existing?.deletedAt) {
      throw new BadRequestException('Review was deleted');
    }

    if (existing?.status === ReviewStatus.HIDDEN) {
      throw new ForbiddenDomainException('Hidden reviews cannot be edited');
    }

    const review = await this.reviewRepository.upsertReview(filter, {
      $set: {
        rating,
        comment,
        isAnonymous,
        status: ReviewStatus.PENDING,
        deletedAt: null,
      },
      $unset: { ...MODERATION_UNSET },
    });

    if (!review) {
      throw new BadRequestException('Could not save review');
    }

    if (
      entityType === ReviewEntityType.ROOM ||
      entityType === ReviewEntityType.TOUR ||
      entityType === ReviewEntityType.HOTEL ||
      entityType === ReviewEntityType.GUIDE
    ) {
      await this.recalcByEntity(entityType, entityId);
    }

    return review;
  }

  async softDeleteOwnReview(reviewId: string, userId: string) {
    const review = await this.reviewRepository.findOneOwnedActive(
      reviewId,
      userId,
    );

    if (!review) {
      return false;
    }

    await this.reviewRepository.softDeleteById(reviewId);

    if (review.status === ReviewStatus.APPROVED && review.rating) {
      await this.recalcByEntity(review.entityType, review.entityId.toString());
    }

    return true;
  }

  async findPublicReviews(params: {
    entityType: ReviewEntityType;
    entityId: string;
    page?: number;
    limit?: number;
  }) {
    const { entityType, entityId, page = 1, limit = 10 } = params;

    return this.reviewRepository.findPublicApproved({
      entityType,
      entityId,
      page,
      limit,
    });
  }

  async findMyReview(params: {
    entityType: ReviewEntityType;
    entityId: string;
    userId: string;
  }) {
    return this.reviewRepository.findMyReview(params);
  }

  async findMyReviewsList(params: {
    userId: string;
    entityType?: ReviewEntityType;
    page?: number;
    limit?: number;
    status?: ReviewStatus | ReviewStatus[];
    lang?: string;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const lang = (params.lang || 'vi').trim() || 'vi';

    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(params.userId),
      deletedAt: null,
    };
    if (params.entityType) {
      filter.entityType = params.entityType;
    }
    if (params.status !== undefined) {
      const st = params.status;
      filter.status = Array.isArray(st) ? { $in: st } : st;
    }

    const [reviews, total] = await this.reviewRepository.findMyReviewsPage({
      filter,
      page,
      limit,
    });

    const summaryMap = await this.buildEntitySummaryMap(
      reviews as Array<{
        entityType: ReviewEntityType;
        entityId: Types.ObjectId;
      }>,
      lang,
    );

    const data = reviews.map((r) => {
      const entityIdStr = r.entityId.toString();
      const key = `${r.entityType}:${entityIdStr}`;
      return {
        ...r,
        entityId: entityIdStr,
        userId: r.userId?.toString(),
        entitySummary:
          summaryMap.get(key) ?? ({ name: '', thumbnailUrl: '' } as const),
      };
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
      },
    };
  }

  async adminFindAll(params: {
    entityType?: ReviewEntityType;
    status?: ReviewStatus | ReviewStatus[];
    includeDeleted?: boolean;
    page: number;
    limit: number;
  }) {
    const { entityType, status, includeDeleted, page, limit } = params;

    const filter: Record<string, unknown> = {};
    if (entityType) filter.entityType = entityType;
    if (status !== undefined) {
      filter.status = Array.isArray(status) ? { $in: status } : status;
    }
    if (!includeDeleted) {
      filter.deletedAt = null;
    }

    const [data, total] = await this.reviewRepository.adminFindPage({
      filter,
      page,
      limit,
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
      },
    };
  }

  async approveReview(id: string, adminUserId: string) {
    return this.setReviewStatusByAdmin(id, adminUserId, {
      status: ReviewStatus.APPROVED,
    });
  }

  async setReviewStatusByAdmin(
    id: string,
    adminUserId: string,
    input: {
      status: ReviewStatus;
      rejectReason?: string;
      hiddenReason?: string;
    },
  ) {
    const review = await this.reviewRepository.findById(id);
    if (!review || review.deletedAt) {
      throw new NotFoundDomainException('Review not found');
    }

    if (
      input.status === ReviewStatus.HIDDEN &&
      review.status !== ReviewStatus.APPROVED
    ) {
      throw new BadRequestException(
        'Only approved reviews can be moved to HIDDEN',
      );
    }

    const adminOid = new Types.ObjectId(adminUserId);
    const now = new Date();
    const { status } = input;

    const $set: Record<string, unknown> = { status };
    const $unset: Record<string, string> = {};

    if (status === ReviewStatus.APPROVED) {
      $set.approvedAt = now;
      $set.approvedBy = adminOid;
      Object.assign($unset, {
        rejectedAt: '',
        rejectedBy: '',
        rejectReason: '',
        hiddenAt: '',
        hiddenBy: '',
        hiddenReason: '',
      });
    } else if (status === ReviewStatus.REJECTED) {
      $set.rejectedAt = now;
      $set.rejectedBy = adminOid;
      if (input.rejectReason !== undefined) {
        $set.rejectReason = input.rejectReason;
      }
      Object.assign($unset, {
        approvedAt: '',
        approvedBy: '',
        hiddenAt: '',
        hiddenBy: '',
        hiddenReason: '',
      });
    } else if (status === ReviewStatus.HIDDEN) {
      $set.hiddenAt = now;
      $set.hiddenBy = adminOid;
      if (input.hiddenReason !== undefined) {
        $set.hiddenReason = input.hiddenReason;
      }
      Object.assign($unset, {
        rejectedAt: '',
        rejectedBy: '',
        rejectReason: '',
      });
    } else if (status === ReviewStatus.PENDING) {
      Object.assign($unset, {
        ...MODERATION_UNSET,
      });
    }

    const updated = await this.reviewRepository.updateById(id, {
      $set,
      ...(Object.keys($unset).length ? { $unset } : {}),
    });

    if (!updated) {
      throw new NotFoundDomainException('Review not found');
    }

    if (
      review.entityType === ReviewEntityType.ROOM ||
      review.entityType === ReviewEntityType.TOUR ||
      review.entityType === ReviewEntityType.HOTEL ||
      review.entityType === ReviewEntityType.GUIDE
    ) {
      await this.recalcByEntity(review.entityType, review.entityId.toString());
    }

    return updated;
  }

  private async recalcByEntity(entityType: ReviewEntityType, entityId: string) {
    if (entityType === ReviewEntityType.ROOM) {
      await this.recalculateRoomRating(entityId);
    } else if (entityType === ReviewEntityType.TOUR) {
      await this.recalculateTourRating(entityId);
    } else if (entityType === ReviewEntityType.HOTEL) {
      await this.recalculateHotelRating(entityId);
    } else if (entityType === ReviewEntityType.GUIDE) {
      await this.recalculateGuideRating(entityId);
    }
  }

  private pickTranslatedName(
    translations: Record<string, { name?: string }> | undefined,
    lang: string,
  ): string {
    if (!translations || typeof translations !== 'object') return '';
    const primary = translations[lang]?.name?.trim();
    if (primary) return primary;
    const vi = translations['vi']?.name?.trim();
    if (vi) return vi;
    for (const code of Object.keys(translations)) {
      const n = translations[code]?.name?.trim();
      if (n) return n;
    }
    return '';
  }

  private pickGuideDisplayName(
    translations:
      | Record<string, { shortBio?: string; bio?: string }>
      | undefined,
    lang: string,
  ): string {
    if (!translations || typeof translations !== 'object') return '';
    const pick = (code: string) => {
      const t = translations[code];
      if (!t) return '';
      return (t.shortBio?.trim() || t.bio?.trim()) ?? '';
    };
    const primary = pick(lang) || pick('vi');
    if (primary) return primary;
    for (const code of Object.keys(translations)) {
      const text = pick(code);
      if (text) return text;
    }
    return '';
  }

  private uniqueEntityIds(
    reviews: Array<{ entityType: ReviewEntityType; entityId: Types.ObjectId }>,
    entityType: ReviewEntityType,
  ): Types.ObjectId[] {
    const seen = new Set<string>();
    const out: Types.ObjectId[] = [];
    for (const r of reviews) {
      if (r.entityType !== entityType) continue;
      const s = r.entityId.toString();
      if (seen.has(s)) continue;
      seen.add(s);
      out.push(r.entityId);
    }
    return out;
  }

  private async buildEntitySummaryMap(
    reviews: Array<{ entityType: ReviewEntityType; entityId: Types.ObjectId }>,
    lang: string,
  ): Promise<Map<string, { name: string; thumbnailUrl: string }>> {
    const map = new Map<string, { name: string; thumbnailUrl: string }>();
    if (!reviews.length) return map;

    const tourIds = this.uniqueEntityIds(reviews, ReviewEntityType.TOUR);
    const roomIds = this.uniqueEntityIds(reviews, ReviewEntityType.ROOM);
    const hotelIds = this.uniqueEntityIds(reviews, ReviewEntityType.HOTEL);
    const guideIds = this.uniqueEntityIds(reviews, ReviewEntityType.GUIDE);

    const [tourDocs, roomDocs, hotelDocs, guideDocs] = await Promise.all([
      this.reviewTargetRepository.findToursSummaryDocs(tourIds),
      this.reviewTargetRepository.findRoomsSummaryDocs(roomIds),
      this.reviewTargetRepository.findHotelsSummaryDocs(hotelIds),
      this.reviewTargetRepository.findTourGuidesSummaryDocs(guideIds),
    ]);

    for (const d of tourDocs) {
      const id = (d._id as Types.ObjectId).toString();
      map.set(`${ReviewEntityType.TOUR}:${id}`, {
        name: this.pickTranslatedName(
          d.translations as Record<string, { name?: string }>,
          lang,
        ),
        thumbnailUrl: d.thumbnail?.url?.trim() ?? '',
      });
    }
    for (const d of roomDocs) {
      const id = (d._id as Types.ObjectId).toString();
      map.set(`${ReviewEntityType.ROOM}:${id}`, {
        name: this.pickTranslatedName(
          d.translations as Record<string, { name?: string }>,
          lang,
        ),
        thumbnailUrl: d.thumbnail?.url?.trim() ?? '',
      });
    }
    for (const d of hotelDocs) {
      const id = (d._id as Types.ObjectId).toString();
      map.set(`${ReviewEntityType.HOTEL}:${id}`, {
        name: this.pickTranslatedName(
          d.translations as Record<string, { name?: string }>,
          lang,
        ),
        thumbnailUrl: d.thumbnail?.url?.trim() ?? '',
      });
    }
    for (const d of guideDocs) {
      const id = (d._id as Types.ObjectId).toString();
      const thumb =
        Array.isArray(d.gallery) && d.gallery.length > 0
          ? (d.gallery[0]?.url?.trim() ?? '')
          : '';
      map.set(`${ReviewEntityType.GUIDE}:${id}`, {
        name: this.pickGuideDisplayName(
          d.translations as Record<string, { shortBio?: string; bio?: string }>,
          lang,
        ),
        thumbnailUrl: thumb,
      });
    }

    return map;
  }

  private ratingPatchFromAggregate(
    raw: { average?: number; total?: number } | undefined,
  ) {
    return {
      average: Number(raw?.average?.toFixed(2) || 0),
      total: raw?.total || 0,
    };
  }

  private async recalculateRoomRating(roomId: string) {
    const result = await this.reviewRepository.aggregateApprovedRating(
      ReviewEntityType.ROOM,
      roomId,
    );
    const ratingSummary = this.ratingPatchFromAggregate(result[0]);
    await this.reviewTargetRepository.updateRoomRatingSummary(
      roomId,
      ratingSummary,
    );
  }

  private async recalculateHotelRating(hotelId: string) {
    const result = await this.reviewRepository.aggregateApprovedRating(
      ReviewEntityType.HOTEL,
      hotelId,
    );
    const ratingSummary = this.ratingPatchFromAggregate(result[0]);
    await this.reviewTargetRepository.updateHotelRatingSummary(
      hotelId,
      ratingSummary,
    );
  }

  private async recalculateTourRating(tourId: string) {
    const result = await this.reviewRepository.aggregateApprovedRating(
      ReviewEntityType.TOUR,
      tourId,
    );
    const ratingSummary = this.ratingPatchFromAggregate(result[0]);
    await this.reviewTargetRepository.updateTourRatingSummary(
      tourId,
      ratingSummary,
    );

    this.eventEmitter.emit(
      TOUR_INDEX_SYNC_EVENT,
      createDomainEventEnvelope({
        eventName: TOUR_INDEX_SYNC_EVENT,
        source: ReviewService.name,
        requestId: this.correlationContext.getRequestId(),
        payload: new TourIndexSyncPayload(tourId),
      }),
    );
  }

  private async recalculateGuideRating(guideId: string) {
    const result = await this.reviewRepository.aggregateApprovedRating(
      ReviewEntityType.GUIDE,
      guideId,
    );
    const ratingSummary = this.ratingPatchFromAggregate(result[0]);
    await this.reviewTargetRepository.updateTourGuideRatingSummary(
      guideId,
      ratingSummary,
    );
  }
}
