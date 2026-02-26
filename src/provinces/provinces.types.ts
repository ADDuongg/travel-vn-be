/**
 * Types for provinces API - copy to FE project
 *
 * PUBLIC:
 *   GET /api/v1/provinces           → PaginatedResponse<ProvinceListItem>
 *   GET /api/v1/provinces/popular   → ProvinceListItem[]
 *   GET /api/v1/provinces/dropdown  → ProvinceDropdownItem[]
 *   GET /api/v1/provinces/:slug     → ProvinceDetail
 *
 * ADMIN:
 *   PATCH  /api/v1/provinces/:id                → ProvinceDetail
 *   PATCH  /api/v1/provinces/:id/toggle-popular → ProvinceDetail
 *   DELETE /api/v1/provinces/:id                → { message: string }
 *   PATCH  /api/v1/provinces/:id/restore        → { message: string }
 */

export interface LocalizedName {
  vi: string;
  en: string;
}

export interface Ward {
  type: string;
  code: string;
  slug: string;
  name: LocalizedName;
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
  seo?: ProvinceSeo;
}

/** Danh sách (không kèm wards) */
export interface ProvinceListItem {
  _id: string;
  type: string;
  code: string;
  slug: string;
  name: LocalizedName;
  fullName?: LocalizedName;
  thumbnail?: ImageItem;
  gallery: ImageItem[];
  translations: Record<string, ProvinceTranslation>;
  isPopular: boolean;
  displayOrder: number;
  isActive: boolean;
  region?: 'NORTH' | 'CENTRAL' | 'SOUTH';
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
  name: LocalizedName;
  fullName?: LocalizedName;
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
