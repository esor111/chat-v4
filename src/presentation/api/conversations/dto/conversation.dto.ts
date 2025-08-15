import { IsString, IsOptional, IsArray, IsEnum, IsUUID, MaxLength, ArrayMaxSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: 'Message content' })
  @IsString()
  @MaxLength(4000)
  content: string;

  @ApiPropertyOptional({ description: 'Message type', enum: ['text', 'image', 'file'] })
  @IsOptional()
  @IsEnum(['text', 'image', 'file'])
  message_type?: string = 'text';
}

export class CreateDirectConversationDto {
  @ApiProperty({ description: 'Target user ID' })
  @IsString()
  @IsUUID()
  target_user_id: string;
}

export class CreateGroupConversationDto {
  @ApiProperty({ description: 'Group name' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Participant user IDs', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsUUID(undefined, { each: true })
  @ArrayMaxSize(7)
  participants: string[];
}

export class MarkAsReadDto {
  @ApiProperty({ description: 'Message ID to mark as read up to' })
  @IsString()
  @IsUUID()
  message_id: string;
}

export class PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Number of items to return', default: 20 })
  @IsOptional()
  limit?: string;

  @ApiPropertyOptional({ description: 'Number of items to skip', default: 0 })
  @IsOptional()
  offset?: string;
}

export class MessagePaginationQueryDto {
  @ApiPropertyOptional({ description: 'Number of messages to return', default: 50 })
  @IsOptional()
  limit?: string;

  @ApiPropertyOptional({ description: 'Get messages before this message ID' })
  @IsOptional()
  @IsUUID()
  before_message_id?: string;
}