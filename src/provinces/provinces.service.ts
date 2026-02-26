import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { Province, ProvinceDocument } from './schema/province.schema';
import { UpdateProvinceDto } from './dto/update-province.dto';
import { ProvinceQueryDto, ProvinceSortBy } from './dto/province-query.dto';

@Injectable()
export class ProvincesService {
  constructor(
    @InjectModel(Province.name)
    private readonly provinceModel: Model<ProvinceDocument>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async findAll(query: ProvinceQueryDto) {
    const {
      page = 1,
      limit = 34,
      region,
      isPopular,
      isActive,
      search,
      sort = ProvinceSortBy.NAME,
    } = query;

    const filter: Record<string, unknown> = {};

    if (typeof isActive === 'boolean') {
      filter.isActive = isActive;
    }
    if (typeof isPopular === 'boolean') {
      filter.isPopular = isPopular;
    }
    if (region) {
      filter.region = region;
    }
    if (search?.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ 'name.vi': regex }, { 'name.en': regex }];
    }

    let sortOption: Record<string, 1 | -1> = { 'name.vi': 1 };
    switch (sort) {
      case ProvinceSortBy.DISPLAY_ORDER:
        sortOption = { displayOrder: 1, 'name.vi': 1 };
        break;
      case ProvinceSortBy.NEWEST:
        sortOption = { createdAt: -1 };
        break;
      case ProvinceSortBy.NAME:
      default:
        sortOption = { 'name.vi': 1 };
        break;
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.provinceModel
        .find(filter)
        .select('-wards')
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.provinceModel.countDocuments(filter),
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

  async findBySlug(slug: string) {
    const province = await this.provinceModel.findOne({ slug }).lean();
    if (!province) throw new NotFoundException('Province not found');
    return province;
  }

  async findPopular() {
    return this.provinceModel
      .find({ isActive: true, isPopular: true })
      .select('-wards')
      .sort({ displayOrder: 1, 'name.vi': 1 })
      .lean();
  }

  /** Dropdown cho form: chi _id, code, slug, name, fullName, wards */
  findAllForDropdown() {
    return this.provinceModel
      .find({ type: 'province' })
      .select('_id code slug name fullName wards')
      .sort({ 'name.vi': 1 })
      .lean();
  }

  async update(
    id: string,
    dto: UpdateProvinceDto,
    thumbnailFile?: Express.Multer.File,
    galleryFiles?: Express.Multer.File[],
  ) {
    const province = await this.provinceModel.findById(id).exec();
    if (!province) throw new NotFoundException('Province not found');

    if (dto.translations !== undefined)
      province.translations = dto.translations;
    if (dto.isPopular !== undefined) province.isPopular = dto.isPopular;
    if (dto.displayOrder !== undefined)
      province.displayOrder = dto.displayOrder;
    if (dto.isActive !== undefined) province.isActive = dto.isActive;
    if (dto.region !== undefined) province.region = dto.region;

    if (dto.gallery !== undefined) {
      await this.deleteRemovedGalleryImages(province.gallery, dto.gallery);
      province.gallery = dto.gallery;
    }

    if (galleryFiles?.length) {
      const uploaded = await this.uploadGallery(galleryFiles);
      province.gallery = [...(province.gallery || []), ...uploaded];
    }

    if (thumbnailFile) {
      await this.applyThumbnail(province, thumbnailFile);
    }

    return province.save().then((p) => p.toObject());
  }

  async softDelete(id: string) {
    const province = await this.provinceModel.findById(id).exec();
    if (!province) throw new NotFoundException('Province not found');
    province.isActive = false;
    await province.save();
    return { message: 'Province deactivated successfully' };
  }

  async restore(id: string) {
    const province = await this.provinceModel.findById(id).exec();
    if (!province) throw new NotFoundException('Province not found');
    province.isActive = true;
    await province.save();
    return { message: 'Province restored successfully' };
  }

  async togglePopular(id: string) {
    const province = await this.provinceModel.findById(id).exec();
    if (!province) throw new NotFoundException('Province not found');
    province.isPopular = !province.isPopular;
    return province.save().then((p) => p.toObject());
  }

  private async uploadGallery(
    files: Express.Multer.File[],
  ): Promise<
    Array<{ url: string; publicId?: string; alt?: string; order?: number }>
  > {
    if (!files?.length) return [];
    const result: Array<{
      url: string;
      publicId?: string;
      alt?: string;
      order?: number;
    }> = [];
    for (let i = 0; i < files.length; i++) {
      const uploaded = await this.cloudinaryService.uploadFile(files[i], {
        folder: 'provinces/gallery',
      });
      result.push({
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        alt: files[i].originalname || undefined,
      });
    }
    return result;
  }

  private async applyThumbnail(
    province: ProvinceDocument,
    file: Express.Multer.File,
  ) {
    if (province.thumbnail?.publicId) {
      await this.cloudinaryService
        .deleteFile(province.thumbnail.publicId)
        .catch(() => {});
    }
    const result = await this.cloudinaryService.uploadFile(file, {
      folder: 'provinces/thumbnail',
    });
    province.thumbnail = {
      url: result.secure_url,
      publicId: result.public_id,
      alt: file.originalname || undefined,
    };
  }

  private async deleteRemovedGalleryImages(
    currentGallery:
      | Array<{ url?: string; publicId?: string }>
      | undefined,
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
}
