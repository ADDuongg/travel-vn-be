/**
 * Frontend types for Tour module
 */

export interface TourTranslation {
  name: string;
  description?: string;
  shortDescription?: string;
  highlights?: string[];
  inclusions?: string[];
  exclusions?: string[];
  notes?: string[];
  cancellationPolicy?: string;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
}

export interface TourItineraryDayTranslation {
  title: string;
  description: string;
  meals?: string[];
  accommodation?: string;
}

export interface TourItineraryDay {
  dayNumber: number;
  translations: Record<string, TourItineraryDayTranslation>;
}

export interface TourDestination {
  provinceId: string | any;
  isMainDestination: boolean;
}

export interface TourContact {
  phone?: string;
  email?: string;
  hotline?: string;
}

export interface TourPricing {
  basePrice: number;
  currency: string;
  childPrice?: number;
  infantPrice?: number;
  singleSupplement?: number;
}

export interface TourDuration {
  days: number;
  nights: number;
}

export interface TourCapacity {
  minGuests: number;
  maxGuests: number;
  privateAvailable: boolean;
}

export interface TourBookingConfig {
  advanceBookingDays: number;
  allowInstantBooking: boolean;
  requireDeposit: boolean;
  depositPercent: number;
}

export interface TourSale {
  isActive: boolean;
  type: 'PERCENT' | 'FIXED';
  value: number;
  startDate?: Date;
  endDate?: Date;
}

export interface TourRatingSummary {
  average: number;
  total: number;
}

export interface TourSchedule {
  departureDays?: string[];
  fixedDepartures?: Array<{
    date: Date;
    availableSlots: number;
    status: string;
  }>;
}

export interface Tour {
  _id: string;
  slug: string;
  code: string;
  isActive: boolean;
  tourType: 'DOMESTIC' | 'INTERNATIONAL' | 'DAILY';
  duration: TourDuration;
  destinations: TourDestination[];
  departureProvinceId: string | any;
  translations: Record<string, TourTranslation>;
  itinerary: TourItineraryDay[];
  capacity: TourCapacity;
  pricing: TourPricing;
  contact?: TourContact;
  thumbnail?: {
    url: string;
    publicId?: string;
    alt?: string;
  };
  gallery: Array<{
    url: string;
    publicId?: string;
    alt?: string;
    order?: number;
  }>;
  amenities: string[] | any[];
  transportTypes: string[];
  bookingConfig: TourBookingConfig;
  sale?: TourSale;
  ratingSummary: TourRatingSummary;
  schedule: TourSchedule;
  difficulty: 'EASY' | 'MODERATE' | 'CHALLENGING' | 'DIFFICULT';
  createdAt: Date;
  updatedAt: Date;
}

export interface TourQueryParams {
  page?: number;
  limit?: number;
  destinationId?: string;
  departureProvinceId?: string;
  tourType?: string;
  minDays?: number;
  maxDays?: number;
  minPrice?: number;
  maxPrice?: number;
  difficulty?: string;
  sortBy?: string;
  search?: string;
  transportTypes?: string[];
}

export interface TourPaginatedResponse {
  items: Tour[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
