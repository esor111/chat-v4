import { IsString, IsNotEmpty, IsOptional, IsArray, IsUUID, MaxLength, MinLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(4000)
  content: string;

  @IsOptional()
  @IsString()
  message_type?: string = 'text';
}

export class CreateConversationDto {
  @IsString()
  @IsNotEmpty()
  type: 'direct' | 'group' | 'business';

  @IsArray()
  @IsUUID(4, { each: true })
  participant_ids: string[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;
}

export class MarkAsReadDto {
  @IsUUID(4)
  message_id: string;
}