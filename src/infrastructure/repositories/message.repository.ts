import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, In } from 'typeorm';
import { Message } from '@domain/entities/message.entity';
import { MessageType } from '@domain/value-objects/message-type.vo';
import { MessageContent } from '@domain/value-objects/message-content.vo';
import { IMessageRepository, IMessageQueryRepository, IMessageCommandRepository } from '@domain/repositories/message.repository.interface';
import { StructuredLoggerService } from '@infrastructure/logging/structured-logger.service';

@Injectable()
export class MessageRepository implements IMessageRepository {
  constructor(
    @InjectRepository(Message)
    private readonly repository: Repository<Message>,
    private readonly logger: StructuredLoggerService,
  ) {}

  async findById(messageId: string): Promise<Message | null> {
    try {
      const message = await this.repository.findOne({ where: { id: messageId } });
      return message || null;
    } catch (error) {
      this.logger.error('Failed to find message by ID', error, {
        service: 'MessageRepository',
        operation: 'findById',
        messageId,
      });
      throw error;
    }
  }

  async findByConversation(conversationId: string, limit?: number, beforeMessageId?: string): Promise<Message[]> {
    try {
      // Use simple find method to avoid query builder column name issues
      const messages = await this.repository.find({
        where: {
          conversationId: conversationId,
          deletedAt: null as any,
        },
        order: { sentAt: 'DESC' },
        take: limit || 50,
      });

      return messages;
    } catch (error) {
      this.logger.error('Failed to find messages by conversation', error, {
        service: 'MessageRepository',
        operation: 'findByConversation',
        conversationId,
        limit,
        beforeMessageId,
      });
      throw error;
    }
  }

  async findUnreadMessages(conversationId: string, lastReadMessageId: string): Promise<Message[]> {
    try {
      return await this.repository.find({
        where: {
          conversationId,
          id: MoreThan(lastReadMessageId),
          deletedAt: null as any,
        },
        order: { sentAt: 'ASC' },
      });
    } catch (error) {
      this.logger.error('Failed to find unread messages', error, {
        service: 'MessageRepository',
        operation: 'findUnreadMessages',
        conversationId,
        lastReadMessageId,
      });
      throw error;
    }
  }

  async save(message: Message): Promise<Message> {
    try {
      const savedMessage = await this.repository.save(message);
      this.logger.debug('Message saved successfully', {
        service: 'MessageRepository',
        operation: 'save',
        messageId: savedMessage.id,
        conversationId: savedMessage.conversationId,
      });
      return savedMessage;
    } catch (error) {
      this.logger.error('Failed to save message', error, {
        service: 'MessageRepository',
        operation: 'save',
        conversationId: message.conversationId,
      });
      throw error;
    }
  }

  async delete(messageId: string): Promise<void> {
    try {
      await this.repository.delete(messageId);
      this.logger.debug('Message deleted successfully', {
        service: 'MessageRepository',
        operation: 'delete',
        messageId,
      });
    } catch (error) {
      this.logger.error('Failed to delete message', error, {
        service: 'MessageRepository',
        operation: 'delete',
        messageId,
      });
      throw error;
    }
  }

  async softDelete(messageId: string): Promise<void> {
    try {
      await this.repository.update(messageId, { deletedAt: new Date() });
      this.logger.debug('Message soft deleted successfully', {
        service: 'MessageRepository',
        operation: 'softDelete',
        messageId,
      });
    } catch (error) {
      this.logger.error('Failed to soft delete message', error, {
        service: 'MessageRepository',
        operation: 'softDelete',
        messageId,
      });
      throw error;
    }
  }
}

@Injectable()
export class MessageQueryRepository implements IMessageQueryRepository {
  constructor(
    @InjectRepository(Message)
    private readonly repository: Repository<Message>,
    private readonly logger: StructuredLoggerService,
  ) {}

  async findById(messageId: string): Promise<Message | null> {
    try {
      const message = await this.repository.findOne({ where: { id: messageId } });
      return message || null;
    } catch (error) {
      this.logger.error('Failed to find message by ID', error, {
        service: 'MessageQueryRepository',
        operation: 'findById',
        messageId,
      });
      throw error;
    }
  }

  async findByConversation(conversationId: string, limit?: number, beforeMessageId?: string): Promise<Message[]> {
    try {
      let query = this.repository
        .createQueryBuilder('message')
        .where('message.conversationId = :conversationId', { conversationId })
        .andWhere('message.deletedAt IS NULL')
        .orderBy('message.sentAt', 'DESC');

      if (beforeMessageId) {
        query = query.andWhere('message.id < :beforeMessageId', { beforeMessageId });
      }

      if (limit) {
        query = query.limit(limit);
      }

      return await query.getMany();
    } catch (error) {
      this.logger.error('Failed to find messages by conversation', error, {
        service: 'MessageQueryRepository',
        operation: 'findByConversation',
        conversationId,
        limit,
        beforeMessageId,
      });
      throw error;
    }
  }

  async findByConversationWithSender(conversationId: string, limit?: number, beforeMessageId?: string): Promise<Message[]> {
    try {
      let query = this.repository
        .createQueryBuilder('message')
        .leftJoinAndSelect('message.sender', 'sender')
        .where('message.conversationId = :conversationId', { conversationId })
        .andWhere('message.deletedAt IS NULL')
        .orderBy('message.sentAt', 'DESC');

      if (beforeMessageId) {
        query = query.andWhere('message.id < :beforeMessageId', { beforeMessageId });
      }

      if (limit) {
        query = query.limit(limit);
      }

      return await query.getMany();
    } catch (error) {
      this.logger.error('Failed to find messages by conversation with sender', error, {
        service: 'MessageQueryRepository',
        operation: 'findByConversationWithSender',
        conversationId,
        limit,
        beforeMessageId,
      });
      throw error;
    }
  }

  async findByType(type: MessageType, limit?: number): Promise<Message[]> {
    try {
      return await this.repository.find({
        where: { type, deletedAt: null as any },
        order: { sentAt: 'DESC' },
        take: limit,
      });
    } catch (error) {
      this.logger.error('Failed to find messages by type', error, {
        service: 'MessageQueryRepository',
        operation: 'findByType',
        type: type.value,
        limit,
      });
      throw error;
    }
  }

  async countByConversation(conversationId: string): Promise<number> {
    try {
      return await this.repository.count({
        where: {
          conversationId,
          deletedAt: null as any,
        },
      });
    } catch (error) {
      this.logger.error('Failed to count messages by conversation', error, {
        service: 'MessageQueryRepository',
        operation: 'countByConversation',
        conversationId,
      });
      throw error;
    }
  }

  async findUnreadMessages(conversationId: string, lastReadMessageId: string): Promise<Message[]> {
    try {
      return await this.repository.find({
        where: {
          conversationId,
          id: MoreThan(lastReadMessageId),
          deletedAt: null as any,
        },
        order: { sentAt: 'ASC' },
      });
    } catch (error) {
      this.logger.error('Failed to find unread messages', error, {
        service: 'MessageQueryRepository',
        operation: 'findUnreadMessages',
        conversationId,
        lastReadMessageId,
      });
      throw error;
    }
  }

  async findMessagesForRetention(olderThanDays: number, limit?: number): Promise<Message[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      return await this.repository.find({
        where: {
          sentAt: LessThan(cutoffDate),
          deletedAt: null as any,
        },
        take: limit,
        order: { sentAt: 'ASC' },
      });
    } catch (error) {
      this.logger.error('Failed to find messages for retention', error, {
        service: 'MessageQueryRepository',
        operation: 'findMessagesForRetention',
        olderThanDays,
        limit,
      });
      throw error;
    }
  }

  async findDeletedMessages(olderThanDays: number, limit?: number): Promise<Message[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      return await this.repository.find({
        where: {
          deletedAt: LessThan(cutoffDate),
        },
        take: limit,
        order: { deletedAt: 'ASC' },
      });
    } catch (error) {
      this.logger.error('Failed to find deleted messages', error, {
        service: 'MessageQueryRepository',
        operation: 'findDeletedMessages',
        olderThanDays,
        limit,
      });
      throw error;
    }
  }
}

@Injectable()
export class MessageCommandRepository implements IMessageCommandRepository {
  constructor(
    @InjectRepository(Message)
    private readonly repository: Repository<Message>,
    private readonly logger: StructuredLoggerService,
  ) {}

  async save(message: Message): Promise<Message> {
    try {
      const savedMessage = await this.repository.save(message);
      this.logger.debug('Message saved successfully', {
        service: 'MessageCommandRepository',
        operation: 'save',
        messageId: savedMessage.id,
        conversationId: savedMessage.conversationId,
      });
      return savedMessage;
    } catch (error) {
      this.logger.error('Failed to save message', error, {
        service: 'MessageCommandRepository',
        operation: 'save',
        conversationId: message.conversationId,
      });
      throw error;
    }
  }

  async delete(messageId: string): Promise<void> {
    try {
      await this.repository.delete(messageId);
      this.logger.debug('Message deleted successfully', {
        service: 'MessageCommandRepository',
        operation: 'delete',
        messageId,
      });
    } catch (error) {
      this.logger.error('Failed to delete message', error, {
        service: 'MessageCommandRepository',
        operation: 'delete',
        messageId,
      });
      throw error;
    }
  }

  async softDelete(messageId: string): Promise<void> {
    try {
      await this.repository.update(messageId, { deletedAt: new Date() });
      this.logger.debug('Message soft deleted successfully', {
        service: 'MessageCommandRepository',
        operation: 'softDelete',
        messageId,
      });
    } catch (error) {
      this.logger.error('Failed to soft delete message', error, {
        service: 'MessageCommandRepository',
        operation: 'softDelete',
        messageId,
      });
      throw error;
    }
  }

  async bulkSoftDelete(messageIds: string[]): Promise<void> {
    try {
      if (messageIds.length === 0) return;
      
      await this.repository.update(
        { id: In(messageIds) },
        { deletedAt: new Date() }
      );
      
      this.logger.debug('Messages bulk soft deleted successfully', {
        service: 'MessageCommandRepository',
        operation: 'bulkSoftDelete',
        count: messageIds.length,
      });
    } catch (error) {
      this.logger.error('Failed to bulk soft delete messages', error, {
        service: 'MessageCommandRepository',
        operation: 'bulkSoftDelete',
        count: messageIds.length,
      });
      throw error;
    }
  }

  async bulkHardDelete(messageIds: string[]): Promise<void> {
    try {
      if (messageIds.length === 0) return;
      
      await this.repository.delete({ id: In(messageIds) });
      
      this.logger.debug('Messages bulk hard deleted successfully', {
        service: 'MessageCommandRepository',
        operation: 'bulkHardDelete',
        count: messageIds.length,
      });
    } catch (error) {
      this.logger.error('Failed to bulk hard delete messages', error, {
        service: 'MessageCommandRepository',
        operation: 'bulkHardDelete',
        count: messageIds.length,
      });
      throw error;
    }
  }

  async updateContent(messageId: string, newContent: string): Promise<void> {
    try {
      const messageContent = MessageContent.create(newContent);
      await this.repository.update(messageId, { content: messageContent });
      
      this.logger.debug('Message content updated successfully', {
        service: 'MessageCommandRepository',
        operation: 'updateContent',
        messageId,
      });
    } catch (error) {
      this.logger.error('Failed to update message content', error, {
        service: 'MessageCommandRepository',
        operation: 'updateContent',
        messageId,
      });
      throw error;
    }
  }
}