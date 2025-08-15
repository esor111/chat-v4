import { Injectable, Logger, Inject } from '@nestjs/common';
import { IConversationRepository } from '@domain/repositories/conversation.repository.interface';
import { IParticipantRepository } from '@domain/repositories/participant.repository.interface';

export interface AccessValidationResult {
  allowed: boolean;
  reason?: string;
}

@Injectable()
export class ConversationAccessService {
  private readonly logger = new Logger(ConversationAccessService.name);

  constructor(
    @Inject('IConversationRepository')
    private readonly conversationRepository: IConversationRepository,
    @Inject('IParticipantRepository')
    private readonly participantRepository: IParticipantRepository,
  ) {}

  /**
   * Validate if user has access to a conversation
   */
  async validateAccess(userId: string, conversationId: string): Promise<AccessValidationResult> {
    try {
      // Check if conversation exists
      const conversation = await this.conversationRepository.findById(conversationId);
      if (!conversation) {
        return { allowed: false, reason: 'Conversation not found' };
      }

      // Check if user is a participant
      const participant = await this.participantRepository.findByConversationAndUser(
        conversationId,
        userId
      );
      if (!participant) {
        return { allowed: false, reason: 'User is not a participant in this conversation' };
      }

      // Check if participant is active (adjust based on your Participant entity)
      // if (participant.leftAt) {
      //   return { allowed: false, reason: 'User has left this conversation' };
      // }

      return { allowed: true };
    } catch (error) {
      this.logger.error(`Error validating access for user ${userId} to conversation ${conversationId}:`, error);
      return { allowed: false, reason: 'Access validation failed' };
    }
  }

  /**
   * Check if user can send messages to conversation
   */
  async canSendMessage(userId: string, conversationId: string): Promise<AccessValidationResult> {
    const accessResult = await this.validateAccess(userId, conversationId);
    if (!accessResult.allowed) {
      return accessResult;
    }

    // Additional checks for message sending could go here
    // For example, checking if conversation is archived, user is muted, etc.

    return { allowed: true };
  }

  /**
   * Check if user can read messages from conversation
   */
  async canReadMessages(userId: string, conversationId: string): Promise<AccessValidationResult> {
    return this.validateAccess(userId, conversationId);
  }

  /**
   * Check if user can manage conversation (admin actions)
   */
  async canManageConversation(userId: string, conversationId: string): Promise<AccessValidationResult> {
    const accessResult = await this.validateAccess(userId, conversationId);
    if (!accessResult.allowed) {
      return accessResult;
    }

    try {
      const conversation = await this.conversationRepository.findById(conversationId);
      
      // For direct conversations, both participants can manage
      if (conversation.type.value === 'direct') {
        return { allowed: true };
      }

      // For group conversations, check if user is admin/creator
      // This would depend on your Participant entity having role information
      // const participant = await this.participantRepository.findByConversationAndUser(conversationId, userId);
      // if (participant.role === 'admin' || participant.role === 'creator') {
      //   return { allowed: true };
      // }

      // For now, allow all participants to manage
      return { allowed: true };
    } catch (error) {
      this.logger.error(`Error checking management permissions:`, error);
      return { allowed: false, reason: 'Permission check failed' };
    }
  }
}