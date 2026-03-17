import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import OpenAI from 'openai';
import { TourService } from 'src/tour/tour.service';
import { TourQueryDto } from 'src/tour/dto/tour-query.dto';
import { HotelService } from 'src/hotel/hotel.service';
import { BookingService } from 'src/booking/booking.service';

const SYSTEM_PROMPT = `You are a friendly and knowledgeable Vietnamese travel assistant. Your name is "Travel VN Assistant".

You help users with:
- Finding and recommending hotels across Vietnam
- Discovering tours and travel experiences
- Exploring Vietnamese local cuisine and food specialties
- Checking booking status and answering travel FAQs

Guidelines:
- Be warm, helpful, and concise
- When users ask about hotels, tours, or food, use the available tools to search for real data
- Provide specific recommendations with details (price, location, rating)
- If the user writes in Vietnamese, respond in Vietnamese. If in English, respond in English.
- Always mention that users can book directly on the platform
- For booking status inquiries, ask for the booking ID if not provided

Available tools:

- searchHotels(location, checkIn, checkOut, priceRange)
- searchTours(destination)
- getBookingStatus(bookingId)

`;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private model: string;
  private provider: 'openai' | 'ollama';
  private openai: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly tourService: TourService,
    private readonly hotelService: HotelService,
    private readonly bookingService: BookingService,
  ) {
    const provider =
      (this.configService.get<string>('LLM_PROVIDER') as 'openai' | 'ollama') ||
      'openai';
    this.provider = provider;

    if (this.provider === 'ollama') {
      const baseURL =
        this.configService.get<string>('OLLAMA_BASE_URL') ||
        'http://127.0.0.1:11434/v1';
      const apiKey =
        this.configService.get<string>('OLLAMA_API_KEY') || 'ollama';
      this.model = this.configService.get<string>('OLLAMA_MODEL') || 'llama3.1';
      this.openai = new OpenAI({
        apiKey,
        baseURL,
      });
    } else {
      this.model = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o';
      this.openai = new OpenAI({
        apiKey: this.configService.get<string>('OPENAI_API_KEY') || '',
        baseURL: this.configService.get<string>('OPENAI_BASE_URL') || undefined,
      });
    }
  }

  async streamChat(
    messages: any[],
    conversationId: string | undefined,
    res: Response,
  ) {
    // TanStack AI SSE Protocol (text/event-stream)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const messageId = this.generateId();

    try {
      const openaiMessages = this.convertToOpenAIMessages(messages);

      await this.processWithToolLoop(res, openaiMessages, messageId);

      // Final done event for TanStack SSE protocol
      this.writeChunk(res, {
        type: 'done',
        id: messageId,
        model: this.model,
        timestamp: Date.now(),
        finishReason: 'stop',
      });
      // [DONE] marker so fetchServerSentEvents() knows to stop
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      this.logger.error('Chat stream error', error);
      this.writeChunk(res, {
        type: 'error',
        id: messageId,
        model: this.model,
        timestamp: Date.now(),
        error: {
          message: error instanceof Error ? error.message : 'An error occurred',
        },
      });
      this.writeChunk(res, {
        type: 'done',
        id: messageId,
        model: this.model,
        timestamp: Date.now(),
        finishReason: 'error',
      });
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }

  private async processWithToolLoop(
    res: Response,
    openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    messageId: string,
    maxIterations = 5,
  ): Promise<string> {
    let iteration = 0;
    let fullText = '';

    while (iteration < maxIterations) {
      iteration++;

      const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming =
        {
          model: this.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...openaiMessages,
          ],
          stream: true,
        };

      if (this.provider === 'openai') {
        // Ollama hiện chưa hỗ trợ tools theo lỗi 400, nên chỉ OpenAI mới truyền tools
        params.tools = [
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
                  minPrice: {
                    type: 'number',
                    description: 'Minimum price per night',
                  },
                  maxPrice: {
                    type: 'number',
                    description: 'Maximum price per night',
                  },
                  starRating: {
                    type: 'number',
                    description: 'Minimum star rating (1-5)',
                  },
                },
                required: ['location'],
              },
            },
          },
        ];
      }

      const stream = await this.openai.chat.completions.create(params);

      let hasToolCalls = false;
      const toolCalls: Map<
        number,
        { id: string; name: string; arguments: string }
      > = new Map();

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        const finishReason = chunk.choices[0]?.finish_reason;

        if (delta?.content) {
          const textDelta = String(delta.content);
          fullText += textDelta;

          // Stream text chunks in TanStack AI SSE format
          this.writeChunk(res, {
            type: 'content',
            id: messageId,
            model: this.model,
            timestamp: Date.now(),
            delta: textDelta,
            content: fullText,
            role: 'assistant',
          });
        }

        if (delta?.tool_calls) {
          hasToolCalls = true;
          for (const tc of delta.tool_calls) {
            if (!toolCalls.has(tc.index)) {
              toolCalls.set(tc.index, {
                id: tc.id || '',
                name: tc.function?.name || '',
                arguments: '',
              });
            }
            const existing = toolCalls.get(tc.index)!;
            if (tc.id) existing.id = tc.id;
            if (tc.function?.name) existing.name = tc.function.name;
            if (tc.function?.arguments) {
              existing.arguments += tc.function.arguments;
            }
          }
        }

        if (finishReason === 'stop') {
          return fullText;
        }

        if (finishReason === 'tool_calls') {
          break;
        }
      }

      if (!hasToolCalls) {
        return fullText;
      }

      const toolCallArr = Array.from(toolCalls.values());

      openaiMessages.push({
        role: 'assistant',
        content: null,
        tool_calls: toolCallArr.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: { name: tc.name, arguments: tc.arguments },
        })),
      });

      for (const tc of toolCallArr) {
        const result = await this.executeTool(tc.name, tc.arguments);
        const resultStr =
          typeof result === 'string' ? result : JSON.stringify(result);

        openaiMessages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: resultStr,
        });
      }
    }

    return fullText;
  }

  private async executeTool(name: string, argsJson: string): Promise<any> {
    try {
      const args = JSON.parse(argsJson);

      switch (name) {
        case 'searchHotels':
          return this.searchHotels(
            args as { location: string; starRating?: number },
          );
        case 'searchTours':
          return this.searchTours(args as { destination: string });
        case 'searchFood':
          return this.searchFood(
            args as { region?: string; dishName?: string },
          );
        case 'getBookingStatus':
          return this.getBookingStatus(args as { bookingId: string });
        case 'getHotelDetails':
          return this.getHotelDetails(args as { hotelId: string });
        case 'getTourDetails':
          return this.getTourDetails(args as { tourId: string });
        default:
          return { error: `Unknown tool: ${name}` };
      }
    } catch (error) {
      this.logger.error(`Tool execution error: ${name}`, error);
      return {
        error: `Failed to execute ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async searchHotels(args: { location: string; starRating?: number }) {
    try {
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
    } catch {
      return { message: `No hotels found in ${args.location}` };
    }
  }

  private async searchTours(args: { destination: string }) {
    try {
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
    } catch {
      return { message: `No tours found for ${args.destination}` };
    }
  }

  private searchFood(args: { region?: string; dishName?: string }) {
    return {
      message: `Here are popular Vietnamese dishes${args.region ? ` from ${args.region}` : ''}`,
      note: 'Food search will be connected to the food database soon',
    };
  }

  private async getBookingStatus(args: { bookingId: string }) {
    try {
      const booking = await this.bookingService.findOne(args.bookingId);
      if (!booking) return { error: 'Booking not found' };
      return {
        id: (booking as any)._id?.toString(),
        status: (booking as any).status,
        checkIn: (booking as any).checkInDate,
        checkOut: (booking as any).checkOutDate,
      };
    } catch {
      return { error: 'Booking not found or invalid ID' };
    }
  }

  private async getHotelDetails(args: { hotelId: string }) {
    try {
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
    } catch {
      return { error: 'Hotel not found or invalid ID' };
    }
  }

  private async getTourDetails(args: { tourId: string }) {
    try {
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
    } catch {
      return { error: 'Tour not found or invalid ID' };
    }
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

  private writeChunk(res: Response, chunk: any) {
    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  private convertToOpenAIMessages(
    messages: any[],
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => {
        const content =
          m.content ||
          m.parts
            ?.filter((p: any) => p.type === 'text')
            .map((p: any) => p.content)
            .join('') ||
          '';

        return {
          role: m.role as 'user' | 'assistant',
          content,
        };
      });
  }
}
