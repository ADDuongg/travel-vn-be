/**
 * Types for Hotel API - copy to FE project
 *
 * APIs:
 * - GET /api/v1/hotels?provinceId=... - List hotels
 * - GET /api/v1/hotels/options?provinceId=... - Dropdown options
 * - GET /api/v1/hotels/:id - Hotel detail
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
}
