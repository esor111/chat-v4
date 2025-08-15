import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ValidationService {
  validateUserId(userId: string, fieldName: string = 'User ID'): void {
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      throw new BadRequestException(`${fieldName} is required and must be a non-empty string`);
    }
  }

  validateConversationId(conversationId: string, fieldName: string = 'Conversation ID'): void {
    if (!conversationId || typeof conversationId !== 'string' || conversationId.trim().length === 0) {
      throw new BadRequestException(`${fieldName} is required and must be a non-empty string`);
    }
  }

  validateMessageContent(content: string): void {
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      throw new BadRequestException('Message content is required and cannot be empty');
    }

    if (content.length > 4000) {
      throw new BadRequestException('Message content cannot exceed 4000 characters');
    }
  }

  validatePaginationParams(limit?: number, offset?: number): { limit: number; offset: number } {
    const validatedLimit = Math.min(Math.max(limit || 20, 1), 100);
    const validatedOffset = Math.max(offset || 0, 0);

    return { limit: validatedLimit, offset: validatedOffset };
  }

  validateParticipantCount(count: number, maxAllowed: number = 7): void {
    if (count === 0) {
      throw new BadRequestException('At least one participant is required');
    }
    
    if (count > maxAllowed) {
      throw new BadRequestException(
        `Maximum ${maxAllowed} participants allowed (${maxAllowed + 1} total including creator)`
      );
    }
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  sanitizeString(input: string): string {
    return input.trim().replace(/\s+/g, ' ');
  }
}