import { Injectable } from '@nestjs/common';
import type OpenAI from 'openai';
import { BookingService } from 'src/booking/booking.service';
import { HotelService } from 'src/hotel/hotel.service';
import { TourQueryDto } from 'src/tour/dto/tour-query.dto';
import { TourService } from 'src/tour/tour.service';

@Injectable()
export class ChatTools {
  constructor(
    private readonly tourService: TourService,
    private readonly hotelService: HotelService,
    private readonly bookingService: BookingService,
  ) {}

  async searchHotels(args: { location: string; starRating?: number }) {
    const allHotels = await this.hotelService.findAllActive();
    const keyword = args.location.toLowerCase();
    const filtered = (allHotels as any[]).filter((h) => {
      const provinceName =
        h.provinceId?.name?.toLowerCase() ||
        h.provinceId?.slug?.toLowerCase() ||
        '';
      const names = this.getAllTranslatedValues(
        h.translations as Record<string, { name?: string }> | undefined,
        'name',
      );
      return (
        provinceName.includes(keyword) ||
        names.some((n) => n.toLowerCase().includes(keyword))
      );
    });
    return filtered
      .slice(0, 5)
      .map(
        (h: {
          _id?: { toString(): string };
          translations?: Record<string, unknown>;
          provinceId?: { name?: string };
          starRating?: number;
        }) => ({
          id: h._id?.toString(),
          name: this.getTranslated(h.translations, 'name') || 'Hotel',
          location: h.provinceId?.name || args.location,
          rating: h.starRating,
        }),
      );
  }

  async searchTours(args: { destination: string }) {
    const query: TourQueryDto = {
      search: args.destination,
      page: 1,
      limit: 5,
    };
    const result = await this.tourService.findAll(query);
    const items = result?.items || result || [];
    type TourItem = {
      _id?: { toString(): string };
      translations?: Record<string, unknown>;
      duration?: unknown;
      price?: unknown;
    };
    return (Array.isArray(items) ? items : [])
      .slice(0, 5)
      .map((t: TourItem) => ({
        id: t._id?.toString(),
        name: this.getTranslated(t.translations, 'name') || 'Tour',
        destination: args.destination,
        duration: t.duration,
        price: t.price,
      }));
  }

  searchFood(args: { region?: string; dishName?: string }) {
    return {
      message: `Here are popular Vietnamese dishes${args.region ? ` from ${args.region}` : ''}`,
      note: 'Food search will be connected to the food database soon',
    };
  }

  async getBookingStatus(args: { bookingId: string }) {
    const booking = await this.bookingService.findOne(args.bookingId);
    if (!booking) return { error: 'Booking not found' };
    return {
      id: (booking as any)._id?.toString(),
      status: (booking as any).status,
      checkIn: (booking as any).checkInDate,
      checkOut: (booking as any).checkOutDate,
    };
  }

  async getHotelDetails(args: { hotelId: string }) {
    const hotel = await this.hotelService.findById(args.hotelId);
    if (!hotel) return { error: 'Hotel not found' };
    const hotelObj = hotel as {
      _id?: { toString(): string };
      translations?: Record<string, unknown>;
      starRating?: number;
    };
    return {
      id: hotelObj._id?.toString(),
      name: this.getTranslated(hotelObj.translations, 'name'),
      rating: hotelObj.starRating,
      description: this.getTranslated(hotelObj.translations, 'description'),
    };
  }

  async getTourDetails(args: { tourId: string }) {
    const tour = await this.tourService.findById(args.tourId);
    if (!tour) return { error: 'Tour not found' };
    const tourObj = tour as {
      _id?: { toString(): string };
      translations?: Record<string, unknown>;
      duration?: unknown;
      price?: unknown;
    };
    return {
      id: tourObj._id?.toString(),
      name: this.getTranslated(tourObj.translations, 'name'),
      duration: tourObj.duration,
      price: tourObj.price,
      description: this.getTranslated(tourObj.translations, 'description'),
    };
  }

  private getTranslated(
    translations: Record<string, any> | undefined,
    field: string,
  ): string | undefined {
    if (!translations) return undefined;
    for (const lang of Object.keys(translations)) {
      const value = translations[lang]?.[field];
      if (value) return value;
    }
    return undefined;
  }

  private getAllTranslatedValues(
    translations: Record<string, any> | undefined,
    field: string,
  ): string[] {
    if (!translations) return [];
    return Object.keys(translations)
      .map((lang) => translations[lang]?.[field])
      .filter(Boolean);
  }
}

export const chatTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'searchHotels',
      description:
        'Search for hotels by location, check-in/check-out dates, price range, and star rating',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'City or province name in Vietnam',
          },
          checkIn: {
            type: 'string',
            description: 'Check-in date (YYYY-MM-DD)',
          },
          checkOut: {
            type: 'string',
            description: 'Check-out date (YYYY-MM-DD)',
          },
          minPrice: { type: 'number', description: 'Minimum price per night' },
          maxPrice: { type: 'number', description: 'Maximum price per night' },
          starRating: {
            type: 'number',
            description: 'Minimum star rating (1-5)',
          },
        },
        required: ['location'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'searchTours',
      description:
        'Search for tours by destination, type, budget, and duration',
      parameters: {
        type: 'object',
        properties: {
          destination: {
            type: 'string',
            description: 'Tour destination or province in Vietnam',
          },
          tourType: {
            type: 'string',
            description: 'Type of tour (adventure, cultural, food, nature)',
          },
          maxBudget: { type: 'number', description: 'Maximum budget for tour' },
          duration: {
            type: 'string',
            description: 'Tour duration (e.g. "3 days", "1 week")',
          },
        },
        required: ['destination'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'searchFood',
      description:
        'Search for local Vietnamese food specialties by region or dish name',
      parameters: {
        type: 'object',
        properties: {
          region: {
            type: 'string',
            description:
              'Region in Vietnam (north, central, south) or province name',
          },
          dishName: { type: 'string', description: 'Name of the dish' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getBookingStatus',
      description: 'Check the status of a booking by booking ID',
      parameters: {
        type: 'object',
        properties: {
          bookingId: { type: 'string', description: 'The booking ID' },
        },
        required: ['bookingId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getHotelDetails',
      description: 'Get detailed information about a specific hotel',
      parameters: {
        type: 'object',
        properties: {
          hotelId: { type: 'string', description: 'The hotel ID' },
        },
        required: ['hotelId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getTourDetails',
      description: 'Get detailed information about a specific tour',
      parameters: {
        type: 'object',
        properties: {
          tourId: { type: 'string', description: 'The tour ID' },
        },
        required: ['tourId'],
      },
    },
  },
];
