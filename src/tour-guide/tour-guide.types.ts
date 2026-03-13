/**
 * Types for TourGuide (FE / API response).
 * Schema: src/tour-guide/schema/tour-guide.schema.ts
 */

export interface TourGuideTranslation {
  bio: string;
  shortBio?: string;
  specialties?: string;
}

export interface TourGuidePublicUser {
  _id: string;
  fullName?: string;
  avatar?: { url: string; publicId?: string };
}

export interface TourGuideListItem {
  _id: string;
  userId: TourGuidePublicUser;
  translations?: Record<string, TourGuideTranslation>;
  languages: string[];
  specializedProvinces: Array<{
    _id: string;
    name?: { vi?: string; en?: string };
    code?: string;
    slug?: string;
  }>;
  certifications: string[];
  licenseNumber?: string;
  yearsOfExperience?: number;
  gallery: Array<{ url: string; publicId?: string; alt?: string }>;
  cv?: { url: string; publicId?: string; filename?: string };
  ratingSummary: { average: number; total: number };
  isAvailable: boolean;
  isVerified: boolean;
  dailyRate?: number;
  currency: string;
  contactMethods: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TourGuideListResponse {
  items: TourGuideListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
