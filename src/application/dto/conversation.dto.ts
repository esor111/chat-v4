import { IsString, IsNumber, IsOptional, IsEnum, IsArray, ValidateNested, IsBoolean, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum ConversationTypeDto {
  DIRECT = 'direct',
  GROUP = 'group',
  BUSINESS = 'business',
}

export enum ParticipantRoleDto {
  CUSTOMER = 'customer',
  AGENT = 'agent',
  BUSINESS = 'business',
  MEMBER = 'member',
  ADMIN = 'admin',
}

export class CreateConversationDto {
  @IsEnum(ConversationTypeDto, { message: 'Type must be direct, group, or business' })
  type: ConversationTypeDto;

  @IsArray()
  @IsNumber({}, { each: true, message: 'Each participant ID must be a number' })
  @Min(1, { each: true, message: 'Each participant ID must be positive' })
  participantIds: number[];

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  title?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  description?: string;
}

export class AddParticipantDto {
  @IsNumber({}, { message: 'User ID must be a number' })
  @Min(1, { message: 'User ID must be positive' })
  userId: number;

  @IsEnum(ParticipantRoleDto, { message: 'Role must be customer, agent, business, member, or admin' })
  role: ParticipantRoleDto;
}

export class UpdateConversationDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  title?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  description?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  avatar?: string;
}

export class ConversationSettingsDto {
  @IsOptional()
  @IsBoolean()
  muteNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  allowFileSharing?: boolean;

  @IsOptional()
  @IsBoolean()
  allowImageSharing?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(2, { message: 'Max participants must be at least 2' })
  @Max(8, { message: 'Max participants cannot exceed 8' })
  maxParticipants?: number;

  @IsOptional()
  @IsBoolean()
  autoDeleteMessages?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Auto delete days must be at least 1' })
  @Max(365, { message: 'Auto delete days cannot exceed 365' })
  autoDeleteDays?: number;
}

export class UpdateConversationSettingsDto {
  @ValidateNested()
  @Type(() => ConversationSettingsDto)
  settings: ConversationSettingsDto;
}

export class ConversationResponseDto {
  @IsNumber()
  conversationId: number;

  @IsEnum(ConversationTypeDto)
  type: ConversationTypeDto;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParticipantResponseDto)
  participants: ParticipantResponseDto[];

  @IsOptional()
  @IsNumber()
  lastMessageId?: number;

  @IsString()
  createdAt: string;

  @IsString()
  lastActivity: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ConversationSettingsDto)
  settings?: ConversationSettingsDto;
}

export class ParticipantResponseDto {
  @IsNumber()
  userId: number;

  @IsEnum(ParticipantRoleDto)
  role: ParticipantRoleDto;

  @IsOptional()
  @IsNumber()
  lastReadMessageId?: number;

  @IsBoolean()
  isMuted: boolean;

  // Profile data will be populated by service layer
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  status?: string;
}