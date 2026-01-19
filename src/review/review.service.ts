import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Room, RoomDocument } from 'src/room/schema/room.schema';
import {
  Review,
  ReviewDocument,
  ReviewEntityType,
} from './schema/ewview.schema';

@Injectable()
export class ReviewService {
  constructor(
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,

    @InjectModel(Room.name)
    private readonly roomModel: Model<RoomDocument>,
  ) {}

  /* ================= CREATE OR UPDATE REVIEW ================= */

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

    const filter: any = {
      entityType,
      entityId: new Types.ObjectId(entityId),
    };

    if (userId) {
      filter.userId = new Types.ObjectId(userId);
    } else {
      filter.isAnonymous = true;
    }

    const review = await this.reviewModel.findOneAndUpdate(
      filter,
      {
        $set: {
          rating,
          comment,
          isAnonymous,
          isApproved: true,
        },
      },
      { upsert: true, new: true },
    );

    // update rating summary nếu là ROOM
    if (entityType === ReviewEntityType.ROOM && rating) {
      await this.recalculateRoomRating(entityId);
    }

    return review;
  }

  async removeReview(id: string) {
    const review = await this.reviewModel.findByIdAndDelete(id);
    if (!review) return false;

    if (review.entityType === ReviewEntityType.ROOM && review.rating) {
      await this.recalculateRoomRating(review.entityId.toString());
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

    return this.reviewModel
      .find({
        entityType,
        entityId: new Types.ObjectId(entityId),
        isApproved: true,
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async findMyReview(params: {
    entityType: ReviewEntityType;
    entityId: string;
    userId: string;
  }) {
    return this.reviewModel.findOne({
      entityType: params.entityType,
      entityId: new Types.ObjectId(params.entityId),
      userId: new Types.ObjectId(params.userId),
    });
  }

  /* ================= ADMIN APPROVE ================= */

  /* ================= ADMIN LIST ================= */

  async adminFindAll(params: {
    entityType?: ReviewEntityType;
    isApproved?: boolean;
    page: number;
    limit: number;
  }) {
    const { entityType, isApproved, page, limit } = params;

    const filter: any = {};
    if (entityType) filter.entityType = entityType;
    if (isApproved !== undefined) filter.isApproved = isApproved;

    const [data, total] = await Promise.all([
      this.reviewModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('userId', 'username email')
        .lean(),
      this.reviewModel.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
      },
    };
  }

  async approveReview(id: string) {
    const review = await this.reviewModel.findByIdAndUpdate(
      id,
      {
        isApproved: true,
        approvedAt: new Date(),
      },
      { new: true },
    );

    if (!review) throw new NotFoundException('Review not found');

    if (review.entityType === ReviewEntityType.ROOM && review.rating) {
      await this.recalculateRoomRating(review.entityId.toString());
    }

    return review;
  }

  /* ================= RATING SUMMARY ================= */

  private async recalculateRoomRating(roomId: string) {
    const result = await this.reviewModel.aggregate([
      {
        $match: {
          entityType: ReviewEntityType.ROOM,
          entityId: new Types.ObjectId(roomId),
          isApproved: true,
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

    const ratingSummary = result[0] || { average: 0, total: 0 };

    await this.roomModel.findByIdAndUpdate(roomId, {
      ratingSummary: {
        average: Number(ratingSummary.average?.toFixed(2) || 0),
        total: ratingSummary.total || 0,
      },
    });
  }
}
