import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, IsNull, Not } from 'typeorm';
import { Message } from '@domain/entities/message.entity';
import { MessageContent } from '@domain/value-objects/message-content.vo';
import { MessageType } from '@domain/value-objects/message-type.vo';
import { StructuredLoggerService } from '@infrastructure/logging/structured-logger.service';

export interface MessageWithSender extends Message {
  senderName?: string;
  senderAvatar?: string;
}

export interface PaginatedMessages {
  messages: MessageWithSender[];
  hasMore: boolean;
  nextCursor?: number;
  totalCount?: number;
}

export interface MessageRetentionStats {
  totalMessages: number;
  messagesForSoftDeletion: number;
  messagesForHardDeletion: number;
  oldestMessage?: Date;
  newestMessage?: Date;
}

@Injectable()
export class EnhancedMessageRepository {
  private readonly SOFT_DELETE_DAYS = 90; // Messages older than 90 days get soft deleted
  private readonly HARD_DELETE_DAYS = 7; // Soft deleted messages older than 7 days get hard deleted

  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly logger: StructuredLoggerService,
  ) {}

  async createMessage(
    conversationId: number,
    senderId: number,
    content: string,
    type: string = 'text',
  ): Promise<Message> {
    try {
      this.logger.log('Creating message', {
        service: 'EnhancedMessageRepository',
        operation: 'createMessage',
        conversationId,
        senderId,
        type,
      });

      const message = new Message();
      message.conversationId = conversationId;
      message.senderId = senderId;
      message.content = MessageContent.create(content);
      message.type = MessageType.fromString(type);

      const savedMessage = await this.messageRepository.save(message);

      this.logger.debug('Message created successfully', {
        service: 'EnhancedMessageRepository',
        operation: 'createMessage',
        messageId: savedMessage.id,
        conversationId,
        senderId,
      });

      return savedMessage;
    } catch (error) {
      this.logger.error('Failed to create message', error, {
        service: 'EnhancedMessageRepository',
        operation: 'createMessage',
        conversationId,
        senderId,
        type,
      });
      throw error;
    }
  }

  async getConversationHistory(
    conversationId: number,
    limit: number = 50,
    beforeMessageId?: number,
  ): Promise<PaginatedMessages> {
    try {
      this.logger.log('Getting conversation history', {
        service: 'EnhancedMessageRepository',
        operation: 'getConversationHistory',
        conversationId,
        limit,
        beforeMessageId,
      });

      let query = this.messageRepository
        .createQueryBuilder('message')
        .leftJoinAndSelect('message.sender', 'sender')
        .where('message.conversationId = :conversationId', { conversationId })
        .andWhere('message.deletedAt IS NULL')
        .orderBy('message.sentAt', 'DESC')
        .limit(limit + 1); // Get one extra to check if there are more

      if (beforeMessageId) {
        query = query.andWhere('message.id < :beforeMessageId', { beforeMessageId });
      }

      const messages = await query.getMany();
      const hasMore = messages.length > limit;

      if (hasMore) {
        messages.pop(); // Remove the extra message
      }

      // Transform messages to include sender info
      const messagesWithSender: MessageWithSender[] = messages.reverse().map(message => ({
        ...message,
        senderName: message.sender?.userId ? `User ${message.sender.userId}` : undefined,
        senderAvatar: undefined, // Would be populated from profile service
      }));

      const result: PaginatedMessages = {
        messages: messagesWithSender,
        hasMore,
        nextCursor: hasMore && messages.length > 0 ? messages[messages.length - 1].id : undefined,
      };

      this.logger.debug('Conversation history retrieved', {
        service: 'EnhancedMessageRepository',
        operation: 'getConversationHistory',
        conversationId,
        messageCount: result.messages.length,
        hasMore: result.hasMore,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to get conversation history', error, {
        service: 'EnhancedMessageRepository',
        operation: 'getConversationHistory',
        conversationId,
        limit,
        beforeMessageId,
      });
      throw error;
    }
  }

  async getMessageById(messageId: number): Promise<MessageWithSender | null> {
    try {
      const message = await this.messageRepository
        .createQueryBuilder('message')
        .leftJoinAndSelect('message.sender', 'sender')
        .where('message.id = :messageId', { messageId })
        .andWhere('message.deletedAt IS NULL')
        .getOne();

      if (!message) {
        return null;
      }

      return {
        ...message,
        senderName: message.sender?.userId ? `User ${message.sender.userId}` : undefined,
        senderAvatar: undefined,
      };
    } catch (error) {
      this.logger.error('Failed to get message by ID', error, {
        service: 'EnhancedMessageRepository',
        operation: 'getMessageById',
        messageId,
      });
      throw error;
    }
  }

  async updateMessage(messageId: number, newContent: string, editedBy: number): Promise<Message> {
    try {
      this.logger.log('Updating message', {
        service: 'EnhancedMessageRepository',
        operation: 'updateMessage',
        messageId,
        editedBy,
      });

      const message = await this.messageRepository.findOne({ where: { id: messageId } });
      if (!message) {
        throw new Error('Message not found');
      }

      // Business rule validations
      if (message.senderId !== editedBy) {
        throw new Error('Only the message sender can edit the message');
      }

      if (message.deletedAt) {
        throw new Error('Cannot edit deleted messages');
      }

      if (message.type.isSystem()) {
        throw new Error('System messages cannot be edited');
      }

      // Check if message is within edit time limit (24 hours)
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
      if (message.sentAt < twentyFourHoursAgo) {
        throw new Error('Messages can only be edited within 24 hours of sending');
      }

      message.content = MessageContent.create(newContent);
      const updatedMessage = await this.messageRepository.save(message);

      this.logger.audit('Message updated', {
        messageId,
        editedBy,
        conversationId: message.conversationId,
      });

      return updatedMessage;
    } catch (error) {
      this.logger.error('Failed to update message', error, {
        service: 'EnhancedMessageRepository',
        operation: 'updateMessage',
        messageId,
        editedBy,
      });
      throw error;
    }
  }

  async softDeleteMessage(messageId: number, deletedBy: number): Promise<void> {
    try {
      this.logger.log('Soft deleting message', {
        service: 'EnhancedMessageRepository',
        operation: 'softDeleteMessage',
        messageId,
        deletedBy,
      });

      const message = await this.messageRepository.findOne({ where: { id: messageId } });
      if (!message) {
        throw new Error('Message not found');
      }

      if (message.deletedAt) {
        throw new Error('Message is already deleted');
      }

      // Business rule: Only sender can delete their own messages (or system can delete any)
      if (deletedBy !== message.senderId && deletedBy !== 0) {
        throw new Error('Only the message sender can delete the message');
      }

      await this.messageRepository.update(messageId, { deletedAt: new Date() });

      this.logger.audit('Message soft deleted', {
        messageId,
        deletedBy,
        conversationId: message.conversationId,
      });
    } catch (error) {
      this.logger.error('Failed to soft delete message', error, {
        service: 'EnhancedMessageRepository',
        operation: 'softDeleteMessage',
        messageId,
        deletedBy,
      });
      throw error;
    }
  }

  async getMessagesForRetention(): Promise<MessageRetentionStats> {
    try {
      this.logger.log('Getting messages for retention analysis', {
        service: 'EnhancedMessageRepository',
        operation: 'getMessagesForRetention',
      });

      const now = new Date();
      const softDeleteCutoff = new Date(now.getTime() - (this.SOFT_DELETE_DAYS * 24 * 60 * 60 * 1000));
      const hardDeleteCutoff = new Date(now.getTime() - (this.HARD_DELETE_DAYS * 24 * 60 * 60 * 1000));

      const [
        totalMessages,
        messagesForSoftDeletion,
        messagesForHardDeletion,
        oldestMessage,
        newestMessage,
      ] = await Promise.all([
        this.messageRepository.count(),
        this.messageRepository.count({
          where: {
            sentAt: LessThan(softDeleteCutoff),
            deletedAt: IsNull(),
          },
        }),
        this.messageRepository.count({
          where: {
            deletedAt: LessThan(hardDeleteCutoff),
          },
        }),
        this.messageRepository.findOne({
          order: { sentAt: 'ASC' },
          select: ['sentAt'],
        }),
        this.messageRepository.findOne({
          order: { sentAt: 'DESC' },
          select: ['sentAt'],
        }),
      ]);

      const stats: MessageRetentionStats = {
        totalMessages,
        messagesForSoftDeletion,
        messagesForHardDeletion,
        oldestMessage: oldestMessage?.sentAt,
        newestMessage: newestMessage?.sentAt,
      };

      this.logger.debug('Message retention stats calculated', {
        service: 'EnhancedMessageRepository',
        operation: 'getMessagesForRetention',
        ...stats,
      });

      return stats;
    } catch (error) {
      this.logger.error('Failed to get messages for retention', error, {
        service: 'EnhancedMessageRepository',
        operation: 'getMessagesForRetention',
      });
      throw error;
    }
  }

  async applySoftDeleteRetentionPolicy(batchSize: number = 1000): Promise<number> {
    try {
      this.logger.log('Applying soft delete retention policy', {
        service: 'EnhancedMessageRepository',
        operation: 'applySoftDeleteRetentionPolicy',
        batchSize,
      });

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.SOFT_DELETE_DAYS);

      const messagesToDelete = await this.messageRepository.find({
        where: {
          sentAt: LessThan(cutoffDate),
          deletedAt: IsNull(),
        },
        take: batchSize,
        select: ['id'],
      });

      if (messagesToDelete.length === 0) {
        this.logger.debug('No messages found for soft deletion', {
          service: 'EnhancedMessageRepository',
          operation: 'applySoftDeleteRetentionPolicy',
        });
        return 0;
      }

      const messageIds = messagesToDelete.map(m => m.id);
      await this.messageRepository.update(
        messageIds,
        { deletedAt: new Date() }
      );

      this.logger.audit('Messages soft deleted by retention policy', {
        count: messagesToDelete.length,
        cutoffDate: cutoffDate.toISOString(),
      });

      return messagesToDelete.length;
    } catch (error) {
      this.logger.error('Failed to apply soft delete retention policy', error, {
        service: 'EnhancedMessageRepository',
        operation: 'applySoftDeleteRetentionPolicy',
        batchSize,
      });
      throw error;
    }
  }

  async applyHardDeleteRetentionPolicy(batchSize: number = 1000): Promise<number> {
    try {
      this.logger.log('Applying hard delete retention policy', {
        service: 'EnhancedMessageRepository',
        operation: 'applyHardDeleteRetentionPolicy',
        batchSize,
      });

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.HARD_DELETE_DAYS);

      const messagesToDelete = await this.messageRepository.find({
        where: {
          deletedAt: LessThan(cutoffDate),
        },
        take: batchSize,
        select: ['id'],
      });

      if (messagesToDelete.length === 0) {
        this.logger.debug('No messages found for hard deletion', {
          service: 'EnhancedMessageRepository',
          operation: 'applyHardDeleteRetentionPolicy',
        });
        return 0;
      }

      const messageIds = messagesToDelete.map(m => m.id);
      await this.messageRepository.delete(messageIds);

      this.logger.audit('Messages hard deleted by retention policy', {
        count: messagesToDelete.length,
        cutoffDate: cutoffDate.toISOString(),
      });

      return messagesToDelete.length;
    } catch (error) {
      this.logger.error('Failed to apply hard delete retention policy', error, {
        service: 'EnhancedMessageRepository',
        operation: 'applyHardDeleteRetentionPolicy',
        batchSize,
      });
      throw error;
    }
  }

  async searchMessages(
    conversationId: number,
    searchTerm: string,
    limit: number = 50,
  ): Promise<MessageWithSender[]> {
    try {
      this.logger.log('Searching messages', {
        service: 'EnhancedMessageRepository',
        operation: 'searchMessages',
        conversationId,
        searchTerm: searchTerm.substring(0, 50), // Log only first 50 chars for privacy
        limit,
      });

      const messages = await this.messageRepository
        .createQueryBuilder('message')
        .leftJoinAndSelect('message.sender', 'sender')
        .where('message.conversationId = :conversationId', { conversationId })
        .andWhere('message.deletedAt IS NULL')
        .andWhere('LOWER(message.content) LIKE LOWER(:searchTerm)', { 
          searchTerm: `%${searchTerm}%` 
        })
        .orderBy('message.sentAt', 'DESC')
        .limit(limit)
        .getMany();

      const messagesWithSender: MessageWithSender[] = messages.map(message => ({
        ...message,
        senderName: message.sender?.userId ? `User ${message.sender.userId}` : undefined,
        senderAvatar: undefined,
      }));

      this.logger.debug('Message search completed', {
        service: 'EnhancedMessageRepository',
        operation: 'searchMessages',
        conversationId,
        resultCount: messagesWithSender.length,
      });

      return messagesWithSender;
    } catch (error) {
      this.logger.error('Failed to search messages', error, {
        service: 'EnhancedMessageRepository',
        operation: 'searchMessages',
        conversationId,
        limit,
      });
      throw error;
    }
  }

  async getUnreadMessagesCount(conversationId: number, lastReadMessageId: number): Promise<number> {
    try {
      const count = await this.messageRepository.count({
        where: {
          conversationId,
          id: MoreThan(lastReadMessageId),
          deletedAt: IsNull(),
        },
      });

      return count;
    } catch (error) {
      this.logger.error('Failed to get unread messages count', error, {
        service: 'EnhancedMessageRepository',
        operation: 'getUnreadMessagesCount',
        conversationId,
        lastReadMessageId,
      });
      throw error;
    }
  }

  async getConversationMessageStats(conversationId: number): Promise<{
    totalMessages: number;
    deletedMessages: number;
    messagesByType: Record<string, number>;
  }> {
    try {
      const [totalMessages, deletedMessages, messagesByTypeResult] = await Promise.all([
        this.messageRepository.count({ where: { conversationId, deletedAt: IsNull() } }),
        this.messageRepository.count({ where: { conversationId, deletedAt: Not(IsNull()) } }),
        this.messageRepository
          .createQueryBuilder('message')
          .select('message.type', 'type')
          .addSelect('COUNT(*)', 'count')
          .where('message.conversationId = :conversationId', { conversationId })
          .andWhere('message.deletedAt IS NULL')
          .groupBy('message.type')
          .getRawMany(),
      ]);

      const messagesByType: Record<string, number> = {};
      messagesByTypeResult.forEach(result => {
        messagesByType[result.type] = parseInt(result.count);
      });

      return {
        totalMessages,
        deletedMessages,
        messagesByType,
      };
    } catch (error) {
      this.logger.error('Failed to get conversation message stats', error, {
        service: 'EnhancedMessageRepository',
        operation: 'getConversationMessageStats',
        conversationId,
      });
      throw error;
    }
  }
}