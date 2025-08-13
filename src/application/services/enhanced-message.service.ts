import { Injectable, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EnhancedMessageRepository, MessageWithSender, PaginatedMessages } from '@infrastructure/repositories/enhanced-message.repository';
import { IParticipantQueryRepository } from '@domain/repositories/participant.repository.interface';
import { IConversationQueryRepository } from '@domain/repositories/conversation.repository.interface';
import { StructuredLoggerService } from '@infrastructure/logging/structured-logger.service';

export interface SendMessageRequest {
  conversationId: string;
  senderId: string;
  content: string;
  type?: string;
}

export interface EditMessageRequest {
  messageId: string;
  newContent: string;
  editedBy: string;
}

export interface GetMessagesRequest {
  conversationId: string;
  userId: string;
  limit?: number;
  beforeMessageId?: string;
}

export interface SearchMessagesRequest {
  conversationId: string;
  userId: string;
  searchTerm: string;
  limit?: number;
}

@Injectable()
export class EnhancedMessageService {
  constructor(
    private readonly messageRepository: EnhancedMessageRepository,
    @Inject('IParticipantQueryRepository')
    private readonly participantQueryRepository: IParticipantQueryRepository,
    @Inject('IConversationQueryRepository')
    private readonly conversationQueryRepository: IConversationQueryRepository,
    private readonly logger: StructuredLoggerService,
  ) {}

  async sendMessage(request: SendMessageRequest): Promise<MessageWithSender> {
    this.logger.log('Sending message', {
      service: 'EnhancedMessageService',
      operation: 'sendMessage',
      conversationId: request.conversationId,
      senderId: request.senderId,
      type: request.type || 'text',
    });

    // Validate user is participant in conversation
    await this.validateUserIsParticipant(request.conversationId, request.senderId);

    // Create message
    const message = await this.messageRepository.createMessage(
      request.conversationId,
      request.senderId,
      request.content,
      request.type,
    );

    // Get message with sender info
    const messageWithSender = await this.messageRepository.getMessageById(message.id);
    if (!messageWithSender) {
      throw new Error('Failed to retrieve created message');
    }

    this.logger.audit('Message sent', {
      messageId: message.id,
      conversationId: request.conversationId,
      senderId: request.senderId,
    });

    return messageWithSender;
  }

  async editMessage(request: EditMessageRequest): Promise<MessageWithSender> {
    this.logger.log('Editing message', {
      service: 'EnhancedMessageService',
      operation: 'editMessage',
      messageId: request.messageId,
      editedBy: request.editedBy,
    });

    // Update message
    const updatedMessage = await this.messageRepository.updateMessage(
      request.messageId,
      request.newContent,
      request.editedBy,
    );

    // Get message with sender info
    const messageWithSender = await this.messageRepository.getMessageById(updatedMessage.id);
    if (!messageWithSender) {
      throw new Error('Failed to retrieve updated message');
    }

    this.logger.audit('Message edited', {
      messageId: request.messageId,
      editedBy: request.editedBy,
      conversationId: updatedMessage.conversationId,
    });

    return messageWithSender;
  }

  async deleteMessage(messageId: string, deletedBy: string): Promise<void> {
    this.logger.log('Deleting message', {
      service: 'EnhancedMessageService',
      operation: 'deleteMessage',
      messageId,
      deletedBy,
    });

    await this.messageRepository.softDeleteMessage(messageId, deletedBy);

    this.logger.audit('Message deleted', {
      messageId,
      deletedBy,
    });
  }

  async getMessages(request: GetMessagesRequest): Promise<PaginatedMessages> {
    this.logger.log('Getting messages', {
      service: 'EnhancedMessageService',
      operation: 'getMessages',
      conversationId: request.conversationId,
      userId: request.userId,
      limit: request.limit || 50,
    });

    // Validate user is participant in conversation
    await this.validateUserIsParticipant(request.conversationId, request.userId);

    // Get conversation history
    const result = await this.messageRepository.getConversationHistory(
      request.conversationId,
      request.limit || 50,
      request.beforeMessageId,
    );

    this.logger.debug('Messages retrieved', {
      service: 'EnhancedMessageService',
      operation: 'getMessages',
      conversationId: request.conversationId,
      messageCount: result.messages.length,
      hasMore: result.hasMore,
    });

    return result;
  }

  async searchMessages(request: SearchMessagesRequest): Promise<MessageWithSender[]> {
    this.logger.log('Searching messages', {
      service: 'EnhancedMessageService',
      operation: 'searchMessages',
      conversationId: request.conversationId,
      userId: request.userId,
      searchTerm: request.searchTerm.substring(0, 50), // Log only first 50 chars
    });

    // Validate user is participant in conversation
    await this.validateUserIsParticipant(request.conversationId, request.userId);

    // Search messages
    const messages = await this.messageRepository.searchMessages(
      request.conversationId,
      request.searchTerm,
      request.limit || 50,
    );

    this.logger.debug('Message search completed', {
      service: 'EnhancedMessageService',
      operation: 'searchMessages',
      conversationId: request.conversationId,
      resultCount: messages.length,
    });

    return messages;
  }

  async getUnreadCount(conversationId: string, userId: string): Promise<number> {
    // Get user's last read message ID
    const participant = await this.participantQueryRepository.findByConversationAndUser(
      conversationId,
      userId,
    );

    if (!participant) {
      throw new Error('User is not a participant in this conversation');
    }

    const lastReadMessageId = participant.lastReadMessageId || '0';
    return await this.messageRepository.getUnreadMessagesCount(conversationId, lastReadMessageId);
  }

  async getConversationStats(conversationId: string, userId: string): Promise<{
    totalMessages: number;
    deletedMessages: number;
    messagesByType: Record<string, number>;
    unreadCount: number;
  }> {
    // Validate user is participant in conversation
    await this.validateUserIsParticipant(conversationId, userId);

    const [stats, unreadCount] = await Promise.all([
      this.messageRepository.getConversationMessageStats(conversationId),
      this.getUnreadCount(conversationId, userId),
    ]);

    return {
      ...stats,
      unreadCount,
    };
  }

  // Scheduled job to apply retention policies
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async applyRetentionPolicies(): Promise<void> {
    this.logger.log('Starting scheduled retention policy application', {
      service: 'EnhancedMessageService',
      operation: 'applyRetentionPolicies',
    });

    try {
      // Get retention stats before cleanup
      const statsBefore = await this.messageRepository.getMessagesForRetention();
      
      this.logger.log('Retention stats before cleanup', {
        service: 'EnhancedMessageService',
        operation: 'applyRetentionPolicies',
        ...statsBefore,
      });

      // Apply soft delete policy in batches
      let totalSoftDeleted = 0;
      let batchSoftDeleted = 0;
      do {
        batchSoftDeleted = await this.messageRepository.applySoftDeleteRetentionPolicy(1000);
        totalSoftDeleted += batchSoftDeleted;
        
        if (batchSoftDeleted > 0) {
          this.logger.debug('Soft delete batch completed', {
            service: 'EnhancedMessageService',
            operation: 'applyRetentionPolicies',
            batchSize: batchSoftDeleted,
            totalSoftDeleted,
          });
        }
      } while (batchSoftDeleted > 0);

      // Apply hard delete policy in batches
      let totalHardDeleted = 0;
      let batchHardDeleted = 0;
      do {
        batchHardDeleted = await this.messageRepository.applyHardDeleteRetentionPolicy(1000);
        totalHardDeleted += batchHardDeleted;
        
        if (batchHardDeleted > 0) {
          this.logger.debug('Hard delete batch completed', {
            service: 'EnhancedMessageService',
            operation: 'applyRetentionPolicies',
            batchSize: batchHardDeleted,
            totalHardDeleted,
          });
        }
      } while (batchHardDeleted > 0);

      // Get retention stats after cleanup
      const statsAfter = await this.messageRepository.getMessagesForRetention();

      this.logger.audit('Retention policies applied successfully', {
        totalSoftDeleted,
        totalHardDeleted,
        statsBefore,
        statsAfter,
      });

    } catch (error) {
      this.logger.error('Failed to apply retention policies', error, {
        service: 'EnhancedMessageService',
        operation: 'applyRetentionPolicies',
      });
      throw error;
    }
  }

  // Manual trigger for retention policies (for testing or emergency cleanup)
  async manualRetentionCleanup(): Promise<{
    softDeleted: number;
    hardDeleted: number;
    statsBefore: any;
    statsAfter: any;
  }> {
    this.logger.log('Manual retention cleanup triggered', {
      service: 'EnhancedMessageService',
      operation: 'manualRetentionCleanup',
    });

    const statsBefore = await this.messageRepository.getMessagesForRetention();
    
    let totalSoftDeleted = 0;
    let totalHardDeleted = 0;

    // Apply soft delete policy
    let batchSoftDeleted = 0;
    do {
      batchSoftDeleted = await this.messageRepository.applySoftDeleteRetentionPolicy(1000);
      totalSoftDeleted += batchSoftDeleted;
    } while (batchSoftDeleted > 0);

    // Apply hard delete policy
    let batchHardDeleted = 0;
    do {
      batchHardDeleted = await this.messageRepository.applyHardDeleteRetentionPolicy(1000);
      totalHardDeleted += batchHardDeleted;
    } while (batchHardDeleted > 0);

    const statsAfter = await this.messageRepository.getMessagesForRetention();

    this.logger.audit('Manual retention cleanup completed', {
      totalSoftDeleted,
      totalHardDeleted,
      statsBefore,
      statsAfter,
    });

    return {
      softDeleted: totalSoftDeleted,
      hardDeleted: totalHardDeleted,
      statsBefore,
      statsAfter,
    };
  }

  private async validateUserIsParticipant(conversationId: string, userId: string): Promise<void> {
    const isParticipant = await this.participantQueryRepository.isParticipant(conversationId, userId);
    if (!isParticipant) {
      throw new Error('User is not authorized to access this conversation');
    }
  }
}