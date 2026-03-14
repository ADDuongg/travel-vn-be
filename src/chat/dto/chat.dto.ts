import { IsArray, IsOptional, IsString } from 'class-validator';

class MessageDto {
  @IsString()
  role: string;

  @IsOptional()
  content?: string;

  @IsOptional()
  parts?: any[];
}

export class ChatRequestDto {
  @IsArray()
  messages: MessageDto[];

  @IsOptional()
  @IsString()
  conversationId?: string;
}
