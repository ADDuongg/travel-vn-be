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

export interface ProvinceDetail extends ProvinceListItem {
  wards: Ward[];
}

export interface ProvinceDropdownItem {
  _id: string;
  code: string;
  slug: string;
  name: DynamicLocalized;
  fullName?: DynamicLocalized;
  wards?: Ward[];
}

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
