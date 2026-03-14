import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import OpenAI from 'openai';
import { TourService } from 'src/tour/tour.service';
import { TourQueryDto } from 'src/tour/dto/tour-query.dto';
import { HotelService } from 'src/hotel/hotel.service';
import { BookingService } from 'src/booking/booking.service';
import { chatTools } from './chat.tools';

interface AGUIEvent {
  type: string;
  timestamp: number;
  [key: string]: any;
}

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
- For booking status inquiries, ask for the booking ID if not provided`;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private openai: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly tourService: TourService,
    private readonly hotelService: HotelService,
    private readonly bookingService: BookingService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async streamChat(
    messages: any[],
    conversationId: string | undefined,
    res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const runId = this.generateId();
    const messageId = this.generateId();

    try {
      this.sendEvent(res, {
        type: 'RUN_STARTED',
        timestamp: Date.now(),
        runId,
        threadId: conversationId,
      });

      const openaiMessages = this.convertToOpenAIMessages(messages);

      await this.processWithToolLoop(res, openaiMessages, runId, messageId);

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      this.logger.error('Chat stream error', error);
      this.sendEvent(res, {
        type: 'RUN_ERROR',
        timestamp: Date.now(),
        runId,
        error: {
          message: error instanceof Error ? error.message : 'An error occurred',
        },
      });
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }

  private async processWithToolLoop(
    res: Response,
    openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    runId: string,
    messageId: string,
    maxIterations = 5,
  ) {
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;

      const stream = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...openaiMessages,
        ],
        tools: chatTools,
        stream: true,
      });

      let hasToolCalls = false;
      const toolCalls: Map<
        number,
        { id: string; name: string; arguments: string }
      > = new Map();
      let textStarted = false;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        const finishReason = chunk.choices[0]?.finish_reason;

        if (delta?.content) {
          if (!textStarted) {
            this.sendEvent(res, {
              type: 'TEXT_MESSAGE_START',
              timestamp: Date.now(),
              messageId,
              role: 'assistant',
            });
            textStarted = true;
          }
          this.sendEvent(res, {
            type: 'TEXT_MESSAGE_CONTENT',
            timestamp: Date.now(),
            messageId,
            delta: delta.content,
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
              if (tc.id) {
                this.sendEvent(res, {
                  type: 'TOOL_CALL_START',
                  timestamp: Date.now(),
                  toolCallId: tc.id,
                  toolName: tc.function?.name || '',
                });
              }
            }
            const existing = toolCalls.get(tc.index)!;
            if (tc.id) existing.id = tc.id;
            if (tc.function?.name) existing.name = tc.function.name;
            if (tc.function?.arguments) {
              existing.arguments += tc.function.arguments;
              this.sendEvent(res, {
                type: 'TOOL_CALL_ARGS',
                timestamp: Date.now(),
                toolCallId: existing.id,
                delta: tc.function.arguments,
              });
            }
          }
        }

        if (finishReason === 'stop') {
          if (textStarted) {
            this.sendEvent(res, {
              type: 'TEXT_MESSAGE_END',
              timestamp: Date.now(),
              messageId,
            });
          }
          this.sendEvent(res, {
            type: 'RUN_FINISHED',
            timestamp: Date.now(),
            runId,
            finishReason: 'stop',
            usage: chunk.usage
              ? {
                  promptTokens: chunk.usage.prompt_tokens,
                  completionTokens: chunk.usage.completion_tokens,
                  totalTokens: chunk.usage.total_tokens,
                }
              : undefined,
          });
          return;
        }

        if (finishReason === 'tool_calls') {
          if (textStarted) {
            this.sendEvent(res, {
              type: 'TEXT_MESSAGE_END',
              timestamp: Date.now(),
              messageId,
            });
            textStarted = false;
          }
          break;
        }
      }

      if (!hasToolCalls) {
        this.sendEvent(res, {
          type: 'RUN_FINISHED',
          timestamp: Date.now(),
          runId,
          finishReason: 'stop',
        });
        return;
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

        this.sendEvent(res, {
          type: 'TOOL_CALL_END',
          timestamp: Date.now(),
          toolCallId: tc.id,
          toolName: tc.name,
          result: resultStr,
        });

        openaiMessages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: resultStr,
        });
      }
    }

    this.sendEvent(res, {
      type: 'RUN_FINISHED',
      timestamp: Date.now(),
      runId,
      finishReason: 'stop',
    });
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

  private sendEvent(res: Response, event: AGUIEvent) {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
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
