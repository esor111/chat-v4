import { IsString, IsNumber, IsOptional, IsEnum, Min, Max, MaxLength, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export enum MessageTypeDto {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  SYSTEM = 'system',
}

export class SendMessageDto {
  @IsNumber({}, { message: 'Conversation ID must be a number' })
  @Min(1, { message: 'Conversation ID must be positive' })
  conversationId: number;

  @IsString({ message: 'Content must be a string' })
  @IsNotEmpty({ message: 'Content cannot be empty' })
  @MaxLength(10000, { message: 'Content cannot exceed 10000 characters' })
  @Transform(({ value }) => value?.trim())
  content: string;

  @IsOptional()
  @IsEnum(MessageTypeDto, { message: 'Type must be text, image, file, or system' })
  type?: MessageTypeDto = MessageTypeDto.TEXT;
}

export class EditMessageDto {
  @IsString({ message: 'Content must be a string' })
  @IsNotEmpty({ message: 'Content cannot be empty' })
  @MaxLength(10000, { message: 'Content cannot exceed 10000 characters' })
  @Transform(({ value }) => value?.trim())
  content: string;
}

export class GetMessagesDto {
  @IsNumber({}, { message: 'Conversation ID must be a number' })
  @Min(1, { message: 'Conversation ID must be positive' })
  conversationId: number;

  @IsOptional()
  @IsNumber({}, { message: 'Before message ID must be a number' })
  @Min(1, { message: 'Before message ID must be positive' })
  beforeMessageId?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit?: number = 50;
}

export class MarkMessagesReadDto {
  @IsNumber({}, { message: 'Conversation ID must be a number' })
  @Min(1, { message: 'Conversation ID must be positive' })
  conversationId: number;

  @IsNumber({}, { message: 'Message ID must be a number' })
  @Min(1, { message: 'Message ID must be positive' })
  messageId: number;
}

export class MessageResponseDto {
  @IsNumber()
  messageId: number;

  @IsNumber()
  conversationId: number;

  @IsNumber()
  senderId: number;

  @IsString()
  content: string;

  @IsEnum(MessageTypeDto)
  type: MessageTypeDto;

  @IsString()
  sentAt: string;

  @IsOptional()
  @IsString()
  deletedAt?: string;

  // Sender profile data will be populated by service layer
  @IsOptional()
  @IsString()
  senderName?: string;

  @IsOptional()
  @IsString()
  senderAvatar?: string;

  // Read status information
  @IsOptional()
  readBy?: Array<{
    userId: number;
    readAt: string;
    userName?: string;
  }>;
}

export class MessageHistoryResponseDto {
  messages: MessageResponseDto[];
  hasMore: boolean;
  nextCursor?: number;
}