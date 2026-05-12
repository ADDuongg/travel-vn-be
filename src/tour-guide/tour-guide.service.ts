import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CorrelationContextService } from 'src/common/correlation/correlation-context.service';
import { createDomainEventEnvelope } from 'src/common/events/domain-event';
import { UserService } from 'src/user/user.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import {
  CreateTourGuideDto,
  CvRefDto,
  GalleryItemDto,
} from './dto/create-tour-guide.dto';
import { UpdateTourGuideDto } from './dto/update-tour-guide.dto';
import { TourGuideQueryDto, TourGuideSortBy } from './dto/tour-guide-query.dto';
import { TourGuide, TourGuideDocument } from './schema/tour-guide.schema';
import { ReviewEntityType } from 'src/review/schema/ewview.schema';
import { ReviewService } from 'src/review/review.service';
import { NotificationEvent } from 'src/notification/notification.constants';
import { TourGuideNotificationEvent } from 'src/notification/events/tour-guide-notification.event';
import { FavoriteService } from 'src/favorite/favorite.service';
import { FavoriteEntityType } from 'src/favorite/favorite.types';

const USER_POPULATE = {
  path: 'userId',
  select: '_id fullName avatar',
  model: 'User',
};

const PROVINCE_POPULATE = {
  path: 'specializedProvinces',
  select: '_id name code slug',
  model: 'Province',
};

type StoredGalleryItem = {
  url: string;
  publicId?: string;
  alt?: string;
  order?: number;
};
type StoredCv = {
  url: string;
  publicId?: string;
  filename?: string;
  format?: string;
};

@Injectable()
export class TourGuideService {
  private readonly logger = new Logger(TourGuideService.name);

  constructor(
    @InjectModel(TourGuide.name)
    private readonly tourGuideModel: Model<TourGuideDocument>,
    private readonly userService: UserService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly reviewService: ReviewService,
    private readonly eventEmitter: EventEmitter2,
    private readonly correlationContext: CorrelationContextService,
    private readonly favoriteService: FavoriteService,
  ) {}

  /** Public + admin: list guides (mặc định chỉ isActive: true). */
  async findAll(query: TourGuideQueryDto, userId?: string) {
    const {
      page = 1,
      limit = 12,
      provinceId,
      language,
      isVerified,
      isAvailable,
      minRating,
      search,
      sort = TourGuideSortBy.NEWEST,
    } = query;

    const filter: Record<string, unknown> = { isActive: true };

    if (provinceId && Types.ObjectId.isValid(provinceId)) {
      filter.specializedProvinces = new Types.ObjectId(provinceId);
    }
    if (language) {
      filter.languages = language;
    }
    if (typeof isVerified === 'boolean') {
      filter.isVerified = isVerified;
    }
    if (typeof isAvailable === 'boolean') {
      filter.isAvailable = isAvailable;
    }
    if (minRating != null && minRating >= 0) {
      filter['ratingSummary.average'] = { $gte: minRating };
    }
    if (search?.trim()) {
      const userIds = await this.userService.findIdsByFullNameSearch(
        search.trim(),
      );
      if (userIds.length === 0) {
        return {
          items: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        };
      }
      filter.userId = { $in: userIds };
    }

    let sortOption: Record<string, 1 | -1> = { createdAt: -1 };
    switch (sort) {
      case TourGuideSortBy.RATING:
        sortOption = { 'ratingSummary.average': -1 };
        break;
      case TourGuideSortBy.EXPERIENCE:
        sortOption = { yearsOfExperience: -1 };
        break;
      case TourGuideSortBy.NEWEST:
        sortOption = { createdAt: -1 };
        break;
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.tourGuideModel
        .find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate(USER_POPULATE)
        .populate(PROVINCE_POPULATE)
        .lean(),
      this.tourGuideModel.countDocuments(filter),
    ]);

    let enrichedItems: any[] = items;
    if (userId) {
      const favSet = await this.favoriteService.existsByUserAndEntities({
        userId,
        pairs: items.map((g: any) => ({
          entityType: FavoriteEntityType.GUIDE,
          entityId: String(g._id),
        })),
      });
      enrichedItems = items.map((g: any) => ({
        ...g,
        isFavorited: favSet.has(`${FavoriteEntityType.GUIDE}:${String(g._id)}`),
      }));
    }

    return {
      items: enrichedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /** Public: chi tiết 1 guide (populate user + provinces). */
  async findOne(id: string, userId?: string) {
    const guide = await this.tourGuideModel
      .findById(id)
      .populate(USER_POPULATE)
      .populate(PROVINCE_POPULATE)
      .lean();
    if (!guide) throw new NotFoundException('Tour guide not found');
    if (!guide.isActive) throw new NotFoundException('Tour guide not found');
    if (!userId) return guide;
    const isFavorited = await this.favoriteService.isFavorited({
      userId,
      entityType: FavoriteEntityType.GUIDE,
      entityId: id,
    });
    return { ...guide, isFavorited: isFavorited.isFavorited };
  }

  /** Admin: tạo guide cho user (truyền userId trong body) + media refs đã upload trước. */
  async create(dto: CreateTourGuideDto) {
    const userId = dto.userId;
    if (!userId || !Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('userId is required');
    }
    const existing = await this.tourGuideModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
    if (existing) {
      throw new BadRequestException('User already has a tour guide profile');
    }
    const gallery = this.normalizeGallery(dto.gallery);
    const cv = dto.cv ? this.pickCv(dto.cv) : undefined;
    const doc = this.toDoc(dto, new Types.ObjectId(userId));
    const created = await this.tourGuideModel.create({ ...doc, gallery, cv });
    await this.userService.addRole(userId, 'guide');
    return created.toObject();
  }

  /** User đăng ký làm guide (userId từ JWT, isVerified: false) + media refs đã upload trước. */
  async register(userId: string, dto: CreateTourGuideDto) {
    const existing = await this.tourGuideModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
    if (existing) {
      throw new BadRequestException(
        'You already have a tour guide profile. Wait for admin verification.',
      );
    }
    const gallery = this.normalizeGallery(dto.gallery);
    const cv = dto.cv ? this.pickCv(dto.cv) : undefined;
    const doc = this.toDoc(dto, new Types.ObjectId(userId), false);
    const created = await this.tourGuideModel.create({ ...doc, gallery, cv });
    await this.userService.addRole(userId, 'guide');

    const user = await this.userService.findBasicInfo(userId);
    this.eventEmitter.emit(
      NotificationEvent.GUIDE_REGISTERED,
      createDomainEventEnvelope({
        eventName: String(NotificationEvent.GUIDE_REGISTERED),
        source: TourGuideService.name,
        requestId: this.correlationContext.getRequestId(),
        payload: new TourGuideNotificationEvent(
          String(created._id),
          userId,
          user?.fullName || user?.username || 'Người dùng',
          user?.email,
        ),
      }),
    );

    return created.toObject();
  }

  /** Guide cập nhật profile của mình bằng JSON refs. */
  async updateMyProfile(userId: string, dto: UpdateTourGuideDto) {
    const guide = await this.tourGuideModel
      .findOne({ userId: new Types.ObjectId(userId), isActive: true })
      .exec();
    if (!guide) throw new NotFoundException('Tour guide profile not found');
    await this.applyUpdate(guide, dto);
    const orphanPublicIds = this.applyMediaUpdate(guide, dto);
    const saved = await guide.save();
    await this.deletePublicIds(orphanPublicIds, 'media');
    return saved.toObject();
  }

  /** Admin: cập nhật bất kỳ guide nào bằng JSON refs. */
  async update(id: string, dto: UpdateTourGuideDto) {
    const guide = await this.tourGuideModel.findById(id).exec();
    if (!guide) throw new NotFoundException('Tour guide not found');
    await this.applyUpdate(guide, dto);
    const orphanPublicIds = this.applyMediaUpdate(guide, dto);
    const saved = await guide.save();
    await this.deletePublicIds(orphanPublicIds, 'media');
    return saved.toObject();
  }

  /** Admin: verify / unverify guide. */
  async verify(id: string, isVerified: boolean) {
    const guide = await this.tourGuideModel.findById(id).exec();
    if (!guide) throw new NotFoundException('Tour guide not found');
    guide.isVerified = isVerified;
    guide.verifiedAt = isVerified ? new Date() : undefined;
    const saved = await guide.save();

    const user = await this.userService.findBasicInfo(String(guide.userId));
    this.eventEmitter.emit(
      NotificationEvent.GUIDE_VERIFIED,
      createDomainEventEnvelope({
        eventName: String(NotificationEvent.GUIDE_VERIFIED),
        source: TourGuideService.name,
        requestId: this.correlationContext.getRequestId(),
        payload: new TourGuideNotificationEvent(
          id,
          String(guide.userId),
          user?.fullName || user?.username || 'Người dùng',
          user?.email,
          isVerified,
        ),
      }),
    );

    return saved.toObject();
  }

  /** Admin toggle availability cho bất kỳ guide nào. */
  async toggleAvailability(id: string) {
    const guide = await this.tourGuideModel.findById(id).exec();
    if (!guide) throw new NotFoundException('Tour guide not found');
    guide.isAvailable = !guide.isAvailable;
    return guide.save().then((g) => g.toObject());
  }

  /* ===== Media helpers (JSON-only pattern) ===== */

  private normalizeGallery(input?: GalleryItemDto[]): StoredGalleryItem[] {
    if (!input?.length) return [];
    return input.map((item, idx) => ({
      url: item.url,
      ...(item.publicId ? { publicId: item.publicId } : {}),
      ...(item.alt ? { alt: item.alt } : {}),
      order: item.order ?? idx,
    }));
  }

  private pickCv(input: CvRefDto): StoredCv {
    return {
      url: input.url,
      ...(input.publicId ? { publicId: input.publicId } : {}),
      ...(input.filename ? { filename: input.filename } : {}),
      ...(input.format ? { format: input.format } : {}),
    };
  }

  private applyMediaUpdate(
    guide: TourGuideDocument,
    dto: UpdateTourGuideDto,
  ): string[] {
    const orphanPublicIds: string[] = [];

    if (dto.gallery !== undefined) {
      const prevGallery = (guide.gallery ?? []) as StoredGalleryItem[];
      const nextGallery = this.normalizeGallery(dto.gallery);
      orphanPublicIds.push(
        ...this.getOrphanGalleryPublicIds(prevGallery, nextGallery),
      );
      guide.gallery = nextGallery;
    }

    if (dto.cv !== undefined) {
      const prevCv = guide.cv as StoredCv | undefined;
      const nextCv = dto.cv ? this.pickCv(dto.cv) : undefined;
      orphanPublicIds.push(...this.getOrphanCvPublicIds(prevCv, nextCv));
      guide.cv = nextCv;
    }

    return orphanPublicIds;
  }

  private getOrphanGalleryPublicIds(
    prevGallery: StoredGalleryItem[],
    nextGallery: StoredGalleryItem[],
  ): string[] {
    const oldIds = new Set(
      prevGallery
        .filter((item): item is StoredGalleryItem & { publicId: string } =>
          Boolean(item.publicId),
        )
        .map((item) => item.publicId),
    );
    const newIds = new Set(
      nextGallery
        .filter((item): item is StoredGalleryItem & { publicId: string } =>
          Boolean(item.publicId),
        )
        .map((item) => item.publicId),
    );

    return [...oldIds].filter((id) => !newIds.has(id));
  }

  private getOrphanCvPublicIds(prevCv?: StoredCv, nextCv?: StoredCv): string[] {
    if (!prevCv?.publicId || prevCv.publicId === nextCv?.publicId) return [];
    return [prevCv.publicId];
  }

  private async deletePublicIds(publicIds: string[], label: string) {
    if (!publicIds.length) return;

    const results = await Promise.allSettled(
      publicIds.map((id) => this.cloudinaryService.deleteFile(id)),
    );
    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.warn(
          `Failed to delete orphan tour-guide ${label} media: ${String(
            result.reason?.message ?? result.reason,
          )}`,
        );
      }
    }
  }

  /** Admin: soft delete + bỏ role guide khỏi User. */
  async softDelete(id: string) {
    const guide = await this.tourGuideModel.findById(id).exec();
    if (!guide) throw new NotFoundException('Tour guide not found');
    guide.isActive = false;
    await guide.save();
    await this.userService.removeRole(String(guide.userId), 'guide');
    return { message: 'Tour guide deactivated successfully' };
  }

  /** GET /:id/reviews — lấy review public cho guide (entityType = GUIDE). */
  async getReviews(id: string, page = 1, limit = 10) {
    const guide = await this.tourGuideModel.findById(id).select('_id').lean();
    if (!guide) throw new NotFoundException('Tour guide not found');

    const items = await this.reviewService.findPublicReviews({
      entityType: ReviewEntityType.GUIDE,
      entityId: id,
      page,
      limit,
    });

    return {
      items,
      pagination: {
        page,
        limit,
        total: items.length,
        totalPages: 1,
      },
    };
  }

  /** Tìm guide theo userId (dùng cho controller my-profile). */
  async findByUserId(userId: string) {
    return this.tourGuideModel
      .findOne({ userId: new Types.ObjectId(userId), isActive: true })
      .populate(USER_POPULATE)
      .populate(PROVINCE_POPULATE)
      .lean();
  }

  private toDoc(
    dto: CreateTourGuideDto,
    userId: Types.ObjectId,
    isVerifiedDefault = false,
  ) {
    return {
      userId,
      translations: dto.translations ?? {},
      languages: dto.languages ?? [],
      specializedProvinces: (dto.specializedProvinces ?? []).map(
        (id) => new Types.ObjectId(id),
      ),
      certifications: dto.certifications ?? [],
      licenseNumber: dto.licenseNumber,
      yearsOfExperience: dto.yearsOfExperience,
      gallery: [],
      ratingSummary: { average: 0, total: 0 },
      responseRate: dto.responseRate ?? 0,
      completedTripsCount: dto.completedTripsCount ?? 0,
      returningCustomerRate: dto.returningCustomerRate ?? 0,
      isAvailable: dto.isAvailable ?? true,
      isActive: true,
      isVerified: isVerifiedDefault,
      dailyRate: dto.dailyRate,
      currency: dto.currency ?? 'VND',
      contactMethods: dto.contactMethods ?? [],
    };
  }

  private async applyUpdate(guide: TourGuideDocument, dto: UpdateTourGuideDto) {
    if (dto.translations !== undefined) guide.translations = dto.translations;
    if (dto.languages !== undefined) guide.languages = dto.languages;
    if (dto.specializedProvinces !== undefined) {
      guide.specializedProvinces = dto.specializedProvinces.map((id) =>
        typeof id === 'string' ? new Types.ObjectId(id) : id,
      );
    }
    if (dto.certifications !== undefined)
      guide.certifications = dto.certifications;
    if (dto.licenseNumber !== undefined)
      guide.licenseNumber = dto.licenseNumber;
    if (dto.yearsOfExperience !== undefined)
      guide.yearsOfExperience = dto.yearsOfExperience;
    if (dto.responseRate !== undefined) guide.responseRate = dto.responseRate;
    if (dto.completedTripsCount !== undefined)
      guide.completedTripsCount = dto.completedTripsCount;
    if (dto.returningCustomerRate !== undefined)
      guide.returningCustomerRate = dto.returningCustomerRate;
    if (dto.isAvailable !== undefined) guide.isAvailable = dto.isAvailable;
    if (dto.dailyRate !== undefined) guide.dailyRate = dto.dailyRate;
    if (dto.currency !== undefined) guide.currency = dto.currency;
    if (dto.contactMethods !== undefined)
      guide.contactMethods = dto.contactMethods;
  }
}
