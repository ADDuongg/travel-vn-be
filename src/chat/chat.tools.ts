import type OpenAI from 'openai';

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
