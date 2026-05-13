import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { NotFoundDomainException } from 'src/common/exceptions';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import {
  BlogPost,
  BlogPostDocument,
  BlogPostTranslation,
  BLOG_POST_STATUS,
} from './schema/blog-post.schema';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { BlogPostQueryDto, BlogPostSort } from './dto/blog-post-query.dto';
import { BlogPostAdminQueryDto } from './dto/blog-post-admin-query.dto';
import { BlogCategoryService } from 'src/blog-category/blog-category.service';
import { BlogTagService } from 'src/blog-tag/blog-tag.service';
import {
  Province,
  ProvinceDocument,
} from 'src/provinces/schema/province.schema';
import { Tour, TourDocument } from 'src/tour/schema/tour.schema';
import { Hotel, HotelDocument } from 'src/hotel/schema/hotel.schema';
import {
  buildTableOfContents,
  normalizeEditorBlocks,
  pickTitleForSlug,
  readingTimeMinutesFromBlocks,
  uniqueBlogPostSlug,
} from './blog.utils';
import { toSlug } from 'src/utils/slug.util';
import {
  Language,
  LanguageDocument,
} from 'src/language/schema/language.schema';

const FALLBACK_LANGS = ['vi', 'en'] as const;
const RESERVED_SLUGS = new Set(['admin', 'featured', 'favicon.ico']);
const DEFAULT_RELATED = 5;

type PublishedSnapshot = {
  status: string;
  categoryId: string;
  tagIds: string[];
};

@Injectable()
export class BlogService {
  constructor(
    @InjectModel(BlogPost.name)
    private readonly blogPostModel: Model<BlogPostDocument>,
    @InjectModel(Province.name)
    private readonly provinceModel: Model<ProvinceDocument>,
    @InjectModel(Tour.name)
    private readonly tourModel: Model<TourDocument>,
    @InjectModel(Hotel.name)
    private readonly hotelModel: Model<HotelDocument>,
    @InjectModel(Language.name)
    private readonly languageModel: Model<LanguageDocument>,
    private readonly blogCategoryService: BlogCategoryService,
    private readonly blogTagService: BlogTagService,
  ) {}

  private async getActiveLangCodes(): Promise<string[]> {
    const langs = await this.languageModel
      .find({ isActive: true })
      .select('code')
      .lean();
    if (!langs.length) return [...FALLBACK_LANGS];
    return langs.map((l) => String(l.code).toLowerCase());
  }

  private validateAndBuildTranslations(
    input: CreateBlogPostDto['translations'],
  ): Record<string, BlogPostTranslation> {
    if (!input || !Object.keys(input).length) {
      throw new BadRequestException(
        'translations must include at least one language',
      );
    }
    const out: Record<string, BlogPostTranslation> = {};
    for (const [lang, v] of Object.entries(input)) {
      if (!v?.title?.trim()) {
        throw new BadRequestException(`translations.${lang}.title is required`);
      }
      if (v.excerpt == null) {
        throw new BadRequestException(
          `translations.${lang}.excerpt is required`,
        );
      }
      if (!Array.isArray(v.content)) {
        throw new BadRequestException(
          `translations.${lang}.content must be an array`,
        );
      }
      const content = normalizeEditorBlocks(v.content);
      for (const b of content) {
        if (!b.id || !b.type) {
          throw new BadRequestException(
            'Each content block must have id and type (Editor.js format)',
          );
        }
      }
      out[lang] = {
        title: v.title,
        excerpt: v.excerpt,
        content: content as BlogPostTranslation['content'],
        readingTime: readingTimeMinutesFromBlocks(content, lang),
        tableOfContents: buildTableOfContents(content),
        seo: v.seo,
      };
    }
    return out;
  }

  private async assertObjectIdsInCollection(
    model: Model<any>,
    ids: string[] | undefined,
    label: string,
  ) {
    if (!ids?.length) return;
    for (const id of ids) {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException(`Invalid ${label} id: ${id}`);
      }
    }
    const count = await model.countDocuments({
      _id: { $in: ids.map((id) => new Types.ObjectId(id)) },
    });
    if (count !== ids.length) {
      throw new BadRequestException(`One or more ${label} ids are invalid`);
    }
  }

  private async resolveCategoryId(category: string | undefined) {
    if (category == null || category === '') return undefined;
    if (!Types.ObjectId.isValid(category)) {
      throw new BadRequestException('Invalid category id');
    }
    await this.blogCategoryService.findById(category);
    return new Types.ObjectId(category);
  }

  private async resolveTagIds(tagIds: string[] | undefined) {
    if (!tagIds?.length) return [] as Types.ObjectId[];
    for (const id of tagIds) {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException('Invalid tag id');
      }
    }
    const found = await this.blogTagService.findByIds(tagIds);
    if (found.length !== tagIds.length) {
      throw new BadRequestException('One or more tag ids are invalid');
    }
    return tagIds.map((id) => new Types.ObjectId(id));
  }

  private toSnapshot(d: {
    status: string;
    category?: Types.ObjectId;
    tags: Types.ObjectId[];
  }): PublishedSnapshot {
    return {
      status: d.status,
      categoryId: d.category ? String(d.category) : '',
      tagIds: (d.tags || []).map((t) => String(t)),
    };
  }

  private async syncCountDelta(
    prev: PublishedSnapshot,
    next: PublishedSnapshot,
  ) {
    const wasPub = prev.status === BLOG_POST_STATUS.PUBLISHED;
    const isPub = next.status === BLOG_POST_STATUS.PUBLISHED;

    if (wasPub && isPub) {
      if (prev.categoryId !== next.categoryId) {
        if (prev.categoryId) {
          await this.blogCategoryService.incPostCount(prev.categoryId, -1);
        }
        if (next.categoryId) {
          await this.blogCategoryService.incPostCount(next.categoryId, 1);
        }
      }
      const a = new Set(prev.tagIds);
      const b = new Set(next.tagIds);
      const dec: string[] = [];
      const inc: string[] = [];
      for (const id of a) {
        if (!b.has(id)) dec.push(id);
      }
      for (const id of b) {
        if (!a.has(id)) inc.push(id);
      }
      if (dec.length) {
        await this.blogTagService.incPostCountMany(
          dec.map((i) => new Types.ObjectId(i)),
          -1,
        );
      }
      if (inc.length) {
        await this.blogTagService.incPostCountMany(
          inc.map((i) => new Types.ObjectId(i)),
          1,
        );
      }
      return;
    }
    if (!wasPub && isPub) {
      if (next.categoryId) {
        await this.blogCategoryService.incPostCount(next.categoryId, 1);
      }
      if (next.tagIds.length) {
        await this.blogTagService.incPostCountMany(
          next.tagIds.map((i) => new Types.ObjectId(i)),
          1,
        );
      }
      return;
    }
    if (wasPub && !isPub) {
      if (prev.categoryId) {
        await this.blogCategoryService.incPostCount(prev.categoryId, -1);
      }
      if (prev.tagIds.length) {
        await this.blogTagService.incPostCountMany(
          prev.tagIds.map((i) => new Types.ObjectId(i)),
          -1,
        );
      }
    }
  }

  private populate() {
    return [
      { path: 'author', select: 'fullName username' },
      { path: 'category', select: 'name slug' },
      { path: 'tags', select: 'name slug' },
      {
        path: 'relatedProvinces',
        select: 'slug name code',
      },
      {
        path: 'relatedTours',
        select: 'slug code translations isActive',
      },
      {
        path: 'relatedHotels',
        select: 'slug translations isActive',
      },
    ];
  }

  async create(authorId: string, dto: CreateBlogPostDto) {
    const translations = this.validateAndBuildTranslations(dto.translations);
    const activeLangs = await this.getActiveLangCodes();
    for (const lang of Object.keys(translations)) {
      if (!activeLangs.includes(lang)) {
        // still allow: admin may add future lang; only warn? Allow all keys for flexibility.
      }
    }

    await this.assertObjectIdsInCollection(
      this.provinceModel,
      dto.relatedProvinces,
      'province',
    );
    await this.assertObjectIdsInCollection(
      this.tourModel,
      dto.relatedTours,
      'tour',
    );
    await this.assertObjectIdsInCollection(
      this.hotelModel,
      dto.relatedHotels,
      'hotel',
    );

    const category = await this.resolveCategoryId(dto.category);
    const tags = await this.resolveTagIds(dto.tags);
    const status = dto.status ?? BLOG_POST_STATUS.DRAFT;

    const slugBase = dto.slug?.trim()
      ? dto.slug
      : pickTitleForSlug(translations);
    const slug = await uniqueBlogPostSlug(slugBase, this.blogPostModel);

    if (RESERVED_SLUGS.has(slug)) {
      throw new BadRequestException('This slug is reserved');
    }

    const publishedAt =
      status === BLOG_POST_STATUS.PUBLISHED ? new Date() : undefined;

    const created = await this.blogPostModel.create({
      slug,
      status,
      isFeatured: dto.isFeatured ?? false,
      author: new Types.ObjectId(authorId),
      category,
      tags,
      relatedProvinces: (dto.relatedProvinces ?? []).map(
        (id) => new Types.ObjectId(id),
      ),
      relatedTours: (dto.relatedTours ?? []).map(
        (id) => new Types.ObjectId(id),
      ),
      relatedHotels: (dto.relatedHotels ?? []).map(
        (id) => new Types.ObjectId(id),
      ),
      thumbnail: dto.thumbnail,
      gallery: dto.gallery ?? [],
      translations,
      viewCount: 0,
      publishedAt,
    });

    const plain = created.toObject();
    await this.syncCountDelta(
      { status: BLOG_POST_STATUS.DRAFT, categoryId: '', tagIds: [] },
      this.toSnapshot(plain),
    );

    return this.blogPostModel
      .findById(created._id)
      .populate(this.populate())
      .lean();
  }

  async findAllPublic(q: BlogPostQueryDto) {
    const {
      page = 1,
      limit = 12,
      search,
      category: categorySlug,
      tag: tagSlug,
      province: provinceSlug,
      sort = BlogPostSort.LATEST,
    } = q;

    const filter: FilterQuery<BlogPostDocument> = {
      status: BLOG_POST_STATUS.PUBLISHED,
      isDeleted: { $ne: true },
    };

    if (categorySlug) {
      const cat = await this.blogCategoryService.findBySlug(categorySlug);
      filter.category = cat._id;
    }
    if (tagSlug) {
      const t = await this.blogTagService.findBySlug(tagSlug);
      filter.tags = t._id;
    }
    if (provinceSlug) {
      const p = await this.provinceModel.findOne({ slug: provinceSlug }).lean();
      if (!p) {
        return {
          items: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        };
      }
      filter.relatedProvinces = p._id;
    }
    if (search?.trim()) {
      const s = search.trim();
      const langCodes = await this.getActiveLangCodes();
      const regex = new RegExp(s, 'i');
      filter.$or = langCodes.map((code) => ({
        [`translations.${code}.title`]: regex,
      }));
    }

    const skip = (page - 1) * limit;
    let sortOpt: Record<string, 1 | -1> = { publishedAt: -1 as const };
    if (sort === BlogPostSort.OLDEST) {
      sortOpt = { publishedAt: 1 as const };
    } else if (sort === BlogPostSort.POPULAR) {
      sortOpt = { viewCount: -1 as const, publishedAt: -1 as const };
    }

    const [items, total] = await Promise.all([
      this.blogPostModel
        .find(filter)
        .sort(sortOpt)
        .skip(skip)
        .limit(limit)
        .populate(this.populate())
        .lean(),
      this.blogPostModel.countDocuments(filter),
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

  findFeatured(limit = 6) {
    return this.blogPostModel
      .find({
        status: BLOG_POST_STATUS.PUBLISHED,
        isDeleted: { $ne: true },
        isFeatured: true,
      })
      .sort({ publishedAt: -1 })
      .limit(Math.min(50, limit))
      .populate(this.populate())
      .lean();
  }

  async findBySlugPublic(slug: string) {
    if (RESERVED_SLUGS.has(slug)) {
      throw new NotFoundDomainException('Blog post not found', 'BLOG_NOT_FOUND', 'blog.not_found');
    }
    const post = await this.blogPostModel
      .findOneAndUpdate(
        {
          slug,
          status: BLOG_POST_STATUS.PUBLISHED,
          isDeleted: { $ne: true },
        },
        { $inc: { viewCount: 1 } },
        { new: true },
      )
      .populate(this.populate())
      .lean();
    if (!post) throw new NotFoundDomainException('Blog post not found', 'BLOG_NOT_FOUND', 'blog.not_found');
    return post;
  }

  async findRelatedBySlug(slug: string) {
    const current = await this.blogPostModel
      .findOne({
        slug,
        status: BLOG_POST_STATUS.PUBLISHED,
        isDeleted: { $ne: true },
      })
      .lean();
    if (!current) {
      throw new NotFoundDomainException('Blog post not found', 'BLOG_NOT_FOUND', 'blog.not_found');
    }
    const or: FilterQuery<BlogPostDocument>[] = [];
    if (current.category) {
      or.push({ category: current.category });
    }
    if (current.tags?.length) {
      or.push({ tags: { $in: current.tags } });
    }
    if (current.relatedProvinces?.length) {
      or.push({ relatedProvinces: { $in: current.relatedProvinces } });
    }
    const base: FilterQuery<BlogPostDocument> = {
      _id: { $ne: current._id },
      status: BLOG_POST_STATUS.PUBLISHED,
      isDeleted: { $ne: true },
    };
    if (or.length) {
      return this.blogPostModel
        .find({ ...base, $or: or })
        .sort({ publishedAt: -1 })
        .limit(DEFAULT_RELATED)
        .populate(this.populate())
        .lean();
    }
    return this.blogPostModel
      .find(base)
      .sort({ publishedAt: -1 })
      .limit(DEFAULT_RELATED)
      .populate(this.populate())
      .lean();
  }

  async findAllAdmin(q: BlogPostAdminQueryDto) {
    const { page = 1, limit = 20, search, status } = q;
    const filter: FilterQuery<BlogPostDocument> = { isDeleted: { $ne: true } };
    if (status) {
      filter.status = status;
    }
    if (search?.trim()) {
      const s = search.trim();
      const langCodes = await this.getActiveLangCodes();
      filter.$or = [
        { slug: new RegExp(s, 'i') },
        ...langCodes.map((code) => ({
          [`translations.${code}.title`]: new RegExp(s, 'i'),
        })),
      ];
    }
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.blogPostModel
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(this.populate())
        .lean(),
      this.blogPostModel.countDocuments(filter),
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

  async findOneAdminById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid id');
    }
    const post = await this.blogPostModel
      .findOne({ _id: id, isDeleted: { $ne: true } })
      .populate(this.populate())
      .lean();
    if (!post) throw new NotFoundDomainException('Blog post not found', 'BLOG_NOT_FOUND', 'blog.not_found');
    return post;
  }

  async update(id: string, dto: UpdateBlogPostDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid id');
    }
    const post = await this.blogPostModel.findById(id);
    if (!post || post.isDeleted) {
      throw new NotFoundDomainException('Blog post not found', 'BLOG_NOT_FOUND', 'blog.not_found');
    }
    const prevSnap = this.toSnapshot(post);

    if (dto.relatedProvinces) {
      await this.assertObjectIdsInCollection(
        this.provinceModel,
        dto.relatedProvinces,
        'province',
      );
    }
    if (dto.relatedTours) {
      await this.assertObjectIdsInCollection(
        this.tourModel,
        dto.relatedTours,
        'tour',
      );
    }
    if (dto.relatedHotels) {
      await this.assertObjectIdsInCollection(
        this.hotelModel,
        dto.relatedHotels,
        'hotel',
      );
    }
    if (dto.category !== undefined) {
      if (dto.category === '' || dto.category == null) {
        post.set('category', null);
      } else {
        const cid = await this.resolveCategoryId(dto.category);
        post.category = cid;
      }
    }
    if (dto.tags !== undefined) {
      post.tags = (await this.resolveTagIds(
        dto.tags,
      )) as unknown as typeof post.tags;
    }
    if (dto.relatedProvinces !== undefined) {
      post.relatedProvinces = dto.relatedProvinces.map(
        (x) => new Types.ObjectId(x),
      );
    }
    if (dto.relatedTours !== undefined) {
      post.relatedTours = dto.relatedTours.map((x) => new Types.ObjectId(x));
    }
    if (dto.relatedHotels !== undefined) {
      post.relatedHotels = dto.relatedHotels.map((x) => new Types.ObjectId(x));
    }
    if (dto.thumbnail !== undefined) post.thumbnail = dto.thumbnail;
    if (dto.gallery !== undefined) post.gallery = dto.gallery;
    if (typeof dto.isFeatured === 'boolean') {
      post.isFeatured = dto.isFeatured;
    }
    if (dto.status !== undefined) {
      post.status = dto.status;
      if (dto.status === BLOG_POST_STATUS.PUBLISHED && !post.publishedAt) {
        post.publishedAt = new Date();
      }
    }

    if (dto.translations) {
      const merged = { ...post.toObject().translations } as Record<
        string,
        BlogPostTranslation
      >;
      for (const [lang, v] of Object.entries(dto.translations)) {
        if (!v) continue;
        const current = merged[lang] || ({} as BlogPostTranslation);
        if (v.title != null) current.title = v.title;
        if (v.excerpt != null) current.excerpt = v.excerpt;
        if (v.content != null) {
          const content = normalizeEditorBlocks(v.content);
          for (const b of content) {
            if (!b.id || !b.type) {
              throw new BadRequestException(
                'Each content block must have id and type',
              );
            }
          }
          current.content = content as BlogPostTranslation['content'];
          current.readingTime = readingTimeMinutesFromBlocks(content, lang);
          current.tableOfContents = buildTableOfContents(content);
        }
        if (v.seo != null) current.seo = v.seo;
        merged[lang] = current;
      }
      post.translations = merged;
    }

    if (dto.slug !== undefined) {
      const newSlug = toSlug(dto.slug);
      if (newSlug !== post.slug) {
        if (RESERVED_SLUGS.has(newSlug)) {
          throw new BadRequestException('This slug is reserved');
        }
        const exists = await this.blogPostModel.findOne({
          slug: newSlug,
          isDeleted: { $ne: true },
          _id: { $ne: post._id },
        });
        if (exists) {
          throw new ConflictException('Blog post slug already exists');
        }
        post.slug = newSlug;
      }
    }

    const nextSnap = this.toSnapshot(post);
    await post.save();
    await this.syncCountDelta(prevSnap, nextSnap);

    return this.blogPostModel
      .findById(post._id)
      .populate(this.populate())
      .lean();
  }

  async publish(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid id');
    }
    const post = await this.blogPostModel.findById(id);
    if (!post || post.isDeleted) {
      throw new NotFoundDomainException('Blog post not found', 'BLOG_NOT_FOUND', 'blog.not_found');
    }
    const prev = this.toSnapshot(post);
    post.status = BLOG_POST_STATUS.PUBLISHED;
    post.publishedAt = post.publishedAt ?? new Date();
    await post.save();
    await this.syncCountDelta(prev, this.toSnapshot(post));
    return this.blogPostModel.findById(id).populate(this.populate()).lean();
  }

  async unpublish(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid id');
    }
    const post = await this.blogPostModel.findById(id);
    if (!post || post.isDeleted) {
      throw new NotFoundDomainException('Blog post not found', 'BLOG_NOT_FOUND', 'blog.not_found');
    }
    const prev = this.toSnapshot(post);
    post.status = BLOG_POST_STATUS.DRAFT;
    await post.save();
    await this.syncCountDelta(prev, this.toSnapshot(post));
    return this.blogPostModel.findById(id).populate(this.populate()).lean();
  }

  async softDelete(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid id');
    }
    const post = await this.blogPostModel.findById(id);
    if (!post || post.isDeleted) {
      throw new NotFoundDomainException('Blog post not found', 'BLOG_NOT_FOUND', 'blog.not_found');
    }
    const prev = this.toSnapshot(post);
    post.isDeleted = true;
    post.deletedAt = new Date();
    await post.save();
    await this.syncCountDelta(prev, {
      status: BLOG_POST_STATUS.DRAFT,
      categoryId: '',
      tagIds: [],
    });
    return { message: 'Blog post deleted' };
  }
}
