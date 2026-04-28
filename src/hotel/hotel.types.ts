/**
 * Types for Hotel API - copy to FE project
 *
 * APIs (public reads):
 * - GET /api/v1/public/hotels?provinceId=...&page=1&limit=12 - List hotels (paginated)
 * - GET /api/v1/public/hotels/options?provinceId=... - Dropdown options
 * - GET /api/v1/public/hotels/:id - Hotel detail
 */

export interface HotelTranslation {
  name: string;
  description?: string;
  shortDescription?: string;
  address?: string;
  policies?: string[];
  seo?: {
    title?: string;
    description?: string;
  };
}

export interface HotelContact {
  phone?: string;
  email?: string;
  website?: string;
}

export interface HotelLocation {
  lat?: number;
  lng?: number;
}

export interface ProvinceRef {
  _id: string;
  name: { vi: string; en: string };
  code: string;
  slug: string;
  fullName?: { vi: string; en: string };
}

export interface HotelRatingSummary {
  average: number;
  total: number;
}

export interface Hotel {
  _id: string;
  slug: string;
  isActive: boolean;
  starRating: number;
  provinceId: string | ProvinceRef;
  translations: Record<string, HotelTranslation>;
  contact?: HotelContact;
  location?: HotelLocation;
  thumbnail?: { url: string; publicId?: string; alt?: string };
  gallery?: Array<{
    url: string;
    publicId?: string;
    alt?: string;
    order?: number;
  }>;
  amenities?: Array<{ _id: string; [key: string]: unknown }>;
  ratingSummary?: HotelRatingSummary;
}

export interface HotelListResponse {
  items: Hotel[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
