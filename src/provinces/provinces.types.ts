/**
 * Types for provinces API - copy to FE project
 *
 * Tài liệu FE (Client + Admin): docs/PROVINCE-FE.md
 *
 * Tỉnh (code, slug, name, wards, …) được tạo bởi seed / import DB — **không** có `POST /provinces`.
 *
 * PUBLIC:
 *   GET /api/v1/provinces           → PaginatedResponse<ProvinceListItem>
 *   GET /api/v1/provinces/popular   → ProvinceListItem[]
 *   GET /api/v1/provinces/dropdown  → ProvinceDropdownItem[]
 *   GET /api/v1/provinces/:slug     → ProvinceDetail
 *
 * ADMIN:
 *   PATCH  /api/v1/provinces/:id                → ProvinceDetail (JSON only; ảnh qua POST /api/v1/media/*)
 *   PATCH  /api/v1/provinces/:id/toggle-popular → ProvinceDetail
 *   DELETE /api/v1/provinces/:id                → { message: string }
 *   PATCH  /api/v1/provinces/:id/restore        → { message: string }
 */

/** Tên/heading đa ngôn ngữ: mã ngôn ngữ (lowercase) -> chuỗi. */
export type DynamicLocalized = Record<string, string>;

export interface Ward {
  type: string;
  code: string;
  slug: string;
  name: DynamicLocalized;
}

export interface ImageItem {
  url: string;
  publicId?: string;
  alt?: string;
  order?: number;
}

export interface ProvinceSeo {
  title?: string;
  description?: string;
  keywords?: string[];
}

export interface ProvinceTranslation {
  description?: string;
  shortDescription?: string;
  bestTimeToVisit?: string;
  seo?: ProvinceSeo;
}

export interface ProvinceHighlightItem {
  translations: Record<string, { name: string; description?: string }>;
  thumbnail?: ImageItem;
}

/** Danh sách (không kèm wards) */
export interface ProvinceListItem {
  _id: string;
  type: string;
  code: string;
  slug: string;
  name: DynamicLocalized;
  fullName?: DynamicLocalized;
  thumbnail?: ImageItem;
  gallery: ImageItem[];
  translations: Record<string, ProvinceTranslation>;
  isPopular: boolean;
  displayOrder: number;
  isActive: boolean;
  region?: 'NORTH' | 'CENTRAL' | 'SOUTH';
  population?: number;
  area?: number;
  highlights?: ProvinceHighlightItem[];
  totalHotels?: number;
  totalTours?: number;
  totalTourGuides?: number;
  createdAt: string;
  updatedAt: string;
}

/** Chi tiết (kèm wards) */
export interface ProvinceDetail extends ProvinceListItem {
  wards: Ward[];
}

/** Dropdown cho form (nhẹ, kèm wards) */
export interface ProvinceDropdownItem {
  _id: string;
  code: string;
  slug: string;
  name: DynamicLocalized;
  fullName?: DynamicLocalized;
  wards?: Ward[];
}

/** Query params cho GET /api/v1/provinces */
export interface ProvinceQueryParams {
  page?: number;
  limit?: number;
  region?: 'NORTH' | 'CENTRAL' | 'SOUTH';
  isPopular?: boolean;
  isActive?: boolean;
  search?: string;
  sort?: 'name' | 'displayOrder' | 'newest';
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
