import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import OpenAI from 'openai';
import { ChatTools, chatTools } from './chat.tools';
import { EnvService } from 'src/env/env.service';

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
    private readonly env: EnvService,
    private readonly chatTools: ChatTools,
  ) {
    const provider =
      (this.env.get('LLM_PROVIDER') as 'openai' | 'ollama') || 'openai';
    this.provider = provider;

    if (this.provider === 'ollama') {
      const baseURL =
        this.env.get('OLLAMA_BASE_URL') || 'http://127.0.0.1:11434/v1';
      const apiKey = this.env.get('OLLAMA_API_KEY') || 'ollama';
      this.model = this.env.get('OLLAMA_MODEL') || 'llama3.1';
      this.openai = new OpenAI({
        apiKey,
        baseURL,
      });
    } else {
      this.model = this.env.get('OPENAI_MODEL') || 'gpt-4o';
      this.openai = new OpenAI({
        apiKey: this.env.get('OPENAI_API_KEY') || '',
        baseURL: this.env.get('OPENAI_BASE_URL') || undefined,
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
        params.tools = chatTools;
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
          return this.chatTools.searchHotels(
            args as { location: string; starRating?: number },
          );
        case 'searchTours':
          return this.chatTools.searchTours(args as { destination: string });
        case 'searchFood':
          return this.chatTools.searchFood(
            args as { region?: string; dishName?: string },
          );
        case 'getBookingStatus':
          return this.chatTools.getBookingStatus(args as { bookingId: string });
        case 'getHotelDetails':
          return this.chatTools.getHotelDetails(args as { hotelId: string });
        case 'getTourDetails':
          return this.chatTools.getTourDetails(args as { tourId: string });
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
