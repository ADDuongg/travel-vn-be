import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, UpdateQuery } from 'mongoose';
import {
  Review,
  ReviewDocument,
  ReviewEntityType,
  ReviewStatus,
} from './schema/ewview.schema';

@Injectable()
export class ReviewRepository {
  constructor(
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,
  ) {}

  findOneForUpsert(filter: Record<string, unknown>) {
    return this.reviewModel.findOne(filter).exec();
  }

  upsertReview(
    filter: Record<string, unknown>,
    update: { $set: Record<string, unknown>; $unset?: Record<string, string> },
  ) {
    return this.reviewModel
      .findOneAndUpdate(filter, update, { upsert: true, new: true })
      .exec();
  }

  findOneOwnedActive(reviewId: string, userId: string) {
    return this.reviewModel.findOne({
      _id: new Types.ObjectId(reviewId),
      userId: new Types.ObjectId(userId),
      deletedAt: null,
    });
  }

  softDeleteById(reviewId: string) {
    return this.reviewModel.findByIdAndUpdate(reviewId, {
      $set: { deletedAt: new Date() },
    });
  }

  findPublicApproved(params: {
    entityType: ReviewEntityType;
    entityId: string;
    page: number;
    limit: number;
  }) {
    const { entityType, entityId, page, limit } = params;
    return this.reviewModel
      .find({
        entityType,
        entityId: new Types.ObjectId(entityId),
        status: ReviewStatus.APPROVED,
        deletedAt: null,
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  findMyReview(params: {
    entityType: ReviewEntityType;
    entityId: string;
    userId: string;
  }) {
    return this.reviewModel.findOne({
      entityType: params.entityType,
      entityId: new Types.ObjectId(params.entityId),
      userId: new Types.ObjectId(params.userId),
      deletedAt: null,
    });
  }

  async findMyReviewsPage(params: {
    filter: Record<string, unknown>;
    page: number;
    limit: number;
  }) {
    const { filter, page, limit } = params;
    return Promise.all([
      this.reviewModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.reviewModel.countDocuments(filter),
    ]);
  }

  async adminFindPage(params: {
    filter: Record<string, unknown>;
    page: number;
    limit: number;
  }) {
    const { filter, page, limit } = params;
    return Promise.all([
      this.reviewModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('userId', 'username email')
        .populate('approvedBy', 'username email')
        .populate('rejectedBy', 'username email')
        .populate('hiddenBy', 'username email')
        .lean(),
      this.reviewModel.countDocuments(filter),
    ]);
  }

  findById(id: string) {
    return this.reviewModel.findById(id).exec();
  }

  updateById(id: string, update: UpdateQuery<ReviewDocument>) {
    return this.reviewModel.findByIdAndUpdate(id, update, { new: true }).exec();
  }

  aggregateApprovedRating(entityType: ReviewEntityType, entityId: string) {
    return this.reviewModel.aggregate([
      {
        $match: {
          entityType,
          entityId: new Types.ObjectId(entityId),
          status: ReviewStatus.APPROVED,
          deletedAt: null,
          rating: { $exists: true },
        },
      },
      {
        $group: {
          _id: null,
          average: { $avg: '$rating' },
          total: { $sum: 1 },
        },
      },
    ]);
  }

  deleteManySoftDeletedBefore(cutoff: Date) {
    return this.reviewModel.deleteMany({
      deletedAt: { $ne: null, $lt: cutoff },
    });
  }
}
