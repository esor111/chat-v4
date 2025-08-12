import { IsString, IsNotEmpty, IsOptional, IsArray, IsNumber, MaxLength, MinLength } from 'class-validator';

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
  @IsNumber({}, { each: true })
  participant_ids: number[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;
}

export class MarkAsReadDto {
  @IsNumber()
  message_id: number;
}