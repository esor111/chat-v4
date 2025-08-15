import { BadRequestException } from '@nestjs/common';
import { CONVERSATION_CONSTANTS } from '../constants';

export class ConversationValidators {
  static validateParticipantCount(count: number, maxAllowed: number = CONVERSATION_CONSTANTS.MAX_PARTICIPANTS): void {
    if (count === 0) {
      throw new BadRequestException('At least one participant is required');
    }
    
    if (count > maxAllowed) {
      throw new BadRequestException(
        `Maximum ${maxAllowed} participants allowed (${maxAllowed + 1} total including creator)`
      );
    }
  }

  static validateUserId(userId: string): void {
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      throw new BadRequestException('Invalid user ID provided');
    }
  }

  static validateConversationId(conversationId: string): void {
    if (!conversationId || typeof conversationId !== 'string' || conversationId.trim().length === 0) {
      throw new BadRequestException('Invalid conversation ID provided');
    }
  }

  static validatePaginationParams(limit?: number, offset?: number): { limit: number; offset: number } {
    const validatedLimit = Math.min(
      Math.max(limit || CONVERSATION_CONSTANTS.DEFAULT_CONVERSATION_LIMIT, 1), 
      CONVERSATION_CONSTANTS.MAX_CONVERSATION_LIMIT
    );
    const validatedOffset = Math.max(offset || 0, 0);

    return { limit: validatedLimit, offset: validatedOffset };
  }
}