import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserService } from 'src/user/user.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { CreateTourGuideDto } from './dto/create-tour-guide.dto';
import { UpdateTourGuideDto } from './dto/update-tour-guide.dto';
import { TourGuideQueryDto, TourGuideSortBy } from './dto/tour-guide-query.dto';
import { TourGuide, TourGuideDocument } from './schema/tour-guide.schema';
import { ReviewEntityType } from 'src/review/schema/ewview.schema';
import { ReviewService } from 'src/review/review.service';
import { NotificationEvent } from 'src/notification/notification.constants';
import { GuideRegisteredEvent } from 'src/notification/events/guide-registered.event';
import { GuideVerifiedEvent } from 'src/notification/events/guide-verified.event';

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

@Injectable()
export class TourGuideService {
  constructor(
    @InjectModel(TourGuide.name)
    private readonly tourGuideModel: Model<TourGuideDocument>,
    private readonly userService: UserService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly reviewService: ReviewService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** Public + admin: list guides (mặc định chỉ isActive: true). */
  async findAll(query: TourGuideQueryDto) {
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

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /** Public: chi tiết 1 guide (populate user + provinces). */
  async findOne(id: string) {
    const guide = await this.tourGuideModel
      .findById(id)
      .populate(USER_POPULATE)
      .populate(PROVINCE_POPULATE)
      .lean();
    if (!guide) throw new NotFoundException('Tour guide not found');
    if (!guide.isActive) throw new NotFoundException('Tour guide not found');
    return guide;
  }

  /** Admin: tạo guide cho user (truyền userId trong body) + optional CV + gallery (upload Cloudinary). */
  async create(
    dto: CreateTourGuideDto,
    cvFile?: Express.Multer.File,
    galleryFiles?: Express.Multer.File[],
  ) {
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
    const doc = this.toDoc(dto, new Types.ObjectId(userId));
    if (galleryFiles?.length) {
      doc.gallery = await this.uploadGallery(galleryFiles);
    }
    const created = await this.tourGuideModel.create(doc);
    await this.userService.addRole(userId, 'guide');
    if (cvFile) {
      await this.applyCvFile(created, cvFile);
      await created.save();
    }
    return created.toObject();
  }

  /** User đăng ký làm guide (userId từ JWT, isVerified: false) + optional CV + gallery (upload Cloudinary). */
  async register(
    userId: string,
    dto: CreateTourGuideDto,
    cvFile?: Express.Multer.File,
    galleryFiles?: Express.Multer.File[],
  ) {
    const existing = await this.tourGuideModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
    if (existing) {
      throw new BadRequestException(
        'You already have a tour guide profile. Wait for admin verification.',
      );
    }
    const doc = this.toDoc(dto, new Types.ObjectId(userId), false);
    if (galleryFiles?.length) {
      doc.gallery = await this.uploadGallery(galleryFiles);
    }
    const created = await this.tourGuideModel.create(doc);
    await this.userService.addRole(userId, 'guide');
    if (cvFile) {
      await this.applyCvFile(created, cvFile);
      await created.save();
    }

    const user = await this.userService.findBasicInfo(userId);
    this.eventEmitter.emit(
      NotificationEvent.GUIDE_REGISTERED,
      new GuideRegisteredEvent(
        String(created._id),
        userId,
        user?.fullName || user?.username || 'Người dùng',
        user?.email,
      ),
    );

    return created.toObject();
  }

  /** Guide cập nhật profile của mình (CV + gallery upload Cloudinary nếu gửi kèm). */
  async updateMyProfile(
    userId: string,
    dto: UpdateTourGuideDto,
    cvFile?: Express.Multer.File,
    galleryFiles?: Express.Multer.File[],
  ) {
    const guide = await this.tourGuideModel
      .findOne({ userId: new Types.ObjectId(userId), isActive: true })
      .exec();
    if (!guide) throw new NotFoundException('Tour guide profile not found');
    await this.applyUpdate(guide, dto);
    if (galleryFiles?.length) {
      const uploaded = await this.uploadGallery(galleryFiles);
      guide.gallery = [...(guide.gallery || []), ...uploaded];
    }
    if (cvFile) {
      await this.applyCvFile(guide, cvFile);
    }
    return guide.save().then((g) => g.toObject());
  }

  /** Admin: cập nhật bất kỳ guide nào (CV + gallery upload Cloudinary nếu gửi kèm). */
  async update(
    id: string,
    dto: UpdateTourGuideDto,
    cvFile?: Express.Multer.File,
    galleryFiles?: Express.Multer.File[],
  ) {
    const guide = await this.tourGuideModel.findById(id).exec();
    if (!guide) throw new NotFoundException('Tour guide not found');
    await this.applyUpdate(guide, dto);
    if (galleryFiles?.length) {
      const uploaded = await this.uploadGallery(galleryFiles);
      guide.gallery = [...(guide.gallery || []), ...uploaded];
    }
    if (cvFile) {
      await this.applyCvFile(guide, cvFile);
    }
    return guide.save().then((g) => g.toObject());
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
      new GuideVerifiedEvent(
        id,
        String(guide.userId),
        user?.fullName || user?.username || 'Người dùng',
        user?.email,
        isVerified,
      ),
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

  /** Upload mảng ảnh lên Cloudinary (folder tour-guides/gallery), trả về mảng { url, publicId, alt }. */
  private async uploadGallery(
    files: Express.Multer.File[],
  ): Promise<Array<{ url: string; publicId?: string; alt?: string }>> {
    if (!files?.length) return [];
    const result: Array<{ url: string; publicId?: string; alt?: string }> = [];
    for (let i = 0; i < files.length; i++) {
      const uploaded = await this.cloudinaryService.uploadFile(files[i], {
        folder: 'tour-guides/gallery',
      });
      result.push({
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        alt: files[i].originalname || undefined,
      });
    }
    return result;
  }

  /** Xóa trên Cloudinary các ảnh có publicId không còn nằm trong danh sách mới. */
  private async deleteRemovedGalleryImages(
    currentGallery: Array<{ url?: string; publicId?: string }> | undefined,
    newGallery: Array<{ url?: string; publicId?: string }> | undefined,
  ) {
    if (!currentGallery?.length || !newGallery) return;
    const newIds = new Set(
      newGallery.map((img) => img.publicId).filter(Boolean),
    );
    const toDelete = currentGallery.filter(
      (img) => img.publicId && !newIds.has(img.publicId),
    );
    await Promise.all(
      toDelete.map((img) =>
        img.publicId
          ? this.cloudinaryService.deleteFile(img.publicId).catch(() => {})
          : Promise.resolve(),
      ),
    );
  }

  private async applyCvFile(
    guide: TourGuideDocument,
    file?: Express.Multer.File,
  ) {
    if (!file) return;

    if (guide.cv?.publicId) {
      await this.cloudinaryService
        .deleteFile(guide.cv.publicId)
        .catch(() => {});
    }

    const result = await this.cloudinaryService.uploadFile(file, {
      folder: 'tour-guides/cv',
    });

    guide.cv = {
      url: result.secure_url,
      publicId: result.public_id,
      filename: file.originalname,
    };
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
      gallery: dto.gallery ?? [],
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
    if (dto.gallery !== undefined) {
      await this.deleteRemovedGalleryImages(guide.gallery, dto.gallery);
      guide.gallery = dto.gallery;
    }
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
