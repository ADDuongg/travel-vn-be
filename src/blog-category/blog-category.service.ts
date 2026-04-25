import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { toSlug, withUniqueSuffix } from 'src/utils/slug.util';
import {
  BlogCategory,
  BlogCategoryDocument,
} from './schema/blog-category.schema';
import { CreateBlogCategoryDto } from './dto/create-blog-category.dto';
import { UpdateBlogCategoryDto } from './dto/update-blog-category.dto';
import { BlogCategoryQueryDto } from './dto/blog-category-query.dto';

@Injectable()
export class BlogCategoryService {
  constructor(
    @InjectModel(BlogCategory.name)
    private readonly blogCategoryModel: Model<BlogCategoryDocument>,
  ) {}

  private pickNameSource(dto: { name: Record<string, string> }): string {
    const n = dto.name;
    return (
      n.vi ||
      n.en ||
      Object.values(n).find((s) => typeof s === 'string' && s.trim()) ||
      'category'
    );
  }

  async create(dto: CreateBlogCategoryDto) {
    if (!dto.name || !Object.keys(dto.name).length) {
      throw new BadRequestException('name must include at least one language');
    }
    const baseSlug = dto.slug?.trim()
      ? toSlug(dto.slug)
      : toSlug(this.pickNameSource(dto));
    const slug = await withUniqueSuffix(baseSlug, async (s) => {
      const exists = await this.blogCategoryModel.findOne({
        slug: s,
        isDeleted: { $ne: true },
      });
      return Boolean(exists);
    });

    return this.blogCategoryModel.create({
      name: dto.name,
      slug,
      description: dto.description ?? {},
      thumbnail: dto.thumbnail,
      order: dto.order ?? 0,
      isActive: dto.isActive ?? true,
      postCount: 0,
      translations: dto.translations ?? {},
    });
  }

  async findAll(query: BlogCategoryQueryDto, options?: { admin?: boolean }) {
    const { page = 1, limit = 50, search, isActive, includeDeleted } = query;
    const filter: Record<string, unknown> = {};

    if (!options?.admin || !includeDeleted) {
      filter.isDeleted = { $ne: true };
    }
    if (typeof isActive === 'boolean') {
      filter.isActive = isActive;
    }
    if (search?.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { 'name.vi': regex },
        { 'name.en': regex },
        { slug: regex },
        { 'description.vi': regex },
        { 'description.en': regex },
      ];
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.blogCategoryModel
        .find(filter)
        .sort({ order: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.blogCategoryModel.countDocuments(filter),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    };
  }

  /** Public: active, not deleted. */
  async findAllPublic(query: BlogCategoryQueryDto) {
    return this.findAll({ ...query, isActive: true }, { admin: false });
  }

  async findBySlug(slug: string) {
    const doc = await this.blogCategoryModel
      .findOne({ slug, isDeleted: { $ne: true } })
      .lean();
    if (!doc) throw new NotFoundException('Blog category not found');
    return doc;
  }

  async findById(id: string) {
    const doc = await this.blogCategoryModel.findById(id).lean();
    if (!doc || doc.isDeleted) {
      throw new NotFoundException('Blog category not found');
    }
    return doc;
  }

  async update(id: string, dto: UpdateBlogCategoryDto) {
    const doc = await this.blogCategoryModel.findById(id);
    if (!doc || doc.isDeleted) {
      throw new NotFoundException('Blog category not found');
    }
    if (dto.name !== undefined) doc.name = dto.name;
    if (dto.description !== undefined) doc.description = dto.description;
    if (dto.thumbnail !== undefined) doc.thumbnail = dto.thumbnail;
    if (dto.order !== undefined) doc.order = dto.order;
    if (typeof dto.isActive === 'boolean') doc.isActive = dto.isActive;
    if (dto.translations !== undefined)
      doc.translations = dto.translations as typeof doc.translations;

    if (dto.slug !== undefined) {
      const newSlug = toSlug(dto.slug);
      if (newSlug !== doc.slug) {
        const exists = await this.blogCategoryModel.findOne({
          slug: newSlug,
          isDeleted: { $ne: true },
          _id: { $ne: doc._id },
        });
        if (exists) throw new ConflictException('Category slug already exists');
        doc.slug = newSlug;
      }
    }

    return doc.save().then((d) => d.toObject());
  }

  /**
   * Adjust denormalized post count (published posts). Used by blog post service.
   */
  async incPostCount(categoryId: string | undefined, delta: number) {
    if (!categoryId || !Types.ObjectId.isValid(categoryId) || !delta) {
      return;
    }
    await this.blogCategoryModel.updateOne(
      { _id: new Types.ObjectId(categoryId) },
      { $inc: { postCount: delta } },
    );
  }

  async softDelete(id: string) {
    const doc = await this.blogCategoryModel.findById(id);
    if (!doc || doc.isDeleted) {
      throw new NotFoundException('Blog category not found');
    }
    doc.isDeleted = true;
    doc.deletedAt = new Date();
    doc.isActive = false;
    await doc.save();
    return { message: 'Blog category deleted' };
  }
}
