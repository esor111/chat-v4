import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '@domain/entities/conversation.entity';
import { ConversationType } from '@domain/value-objects/conversation-type.vo';
import { IConversationRepository, IConversationQueryRepository, IConversationCommandRepository } from '@domain/repositories/conversation.repository.interface';
import { StructuredLoggerService } from '@infrastructure/logging/structured-logger.service';

@Injectable()
export class ConversationRepository implements IConversationRepository {
  constructor(
    @InjectRepository(Conversation)
    private readonly repository: Repository<Conversation>,
    private readonly logger: StructuredLoggerService,
  ) {}

  async findById(conversationId: number): Promise<Conversation | null> {
    try {
      const conversation = await this.repository.findOne({ where: { id: conversationId } });
      return conversation || null;
    } catch (error) {
      this.logger.error('Failed to find conversation by ID', error, {
        service: 'ConversationRepository',
        operation: 'findById',
        conversationId,
      });
      throw error;
    }
  }

  async findByIds(conversationIds: number[], options?: { limit?: number; offset?: number }): Promise<Conversation[]> {
    try {
      if (conversationIds.length === 0) {
        return [];
      }

      const { limit, offset } = options || {};
      
      let query = this.repository
        .createQueryBuilder('conversation')
        .where('conversation.id IN (:...ids)', { ids: conversationIds })
        .orderBy('conversation.lastActivity', 'DESC');

      if (limit) {
        query = query.limit(limit);
      }

      if (offset) {
        query = query.offset(offset);
      }

      return await query.getMany();
    } catch (error) {
      this.logger.error('Failed to find conversations by IDs', error, {
        service: 'ConversationRepository',
        operation: 'findByIds',
        conversationIds,
      });
      throw error;
    }
  }

  async findByParticipant(userId: number): Promise<Conversation[]> {
    try {
      return await this.repository
        .createQueryBuilder('conversation')
        .innerJoin('conversation.participants', 'participant')
        .where('participant.userId = :userId', { userId })
        .orderBy('conversation.lastActivity', 'DESC')
        .getMany();
    } catch (error) {
      this.logger.error('Failed to find conversations by participant', error, {
        service: 'ConversationRepository',
        operation: 'findByParticipant',
        userId,
      });
      throw error;
    }
  }

  async save(conversation: Conversation): Promise<Conversation> {
    try {
      const savedConversation = await this.repository.save(conversation);
      this.logger.debug('Conversation saved successfully', {
        service: 'ConversationRepository',
        operation: 'save',
        conversationId: savedConversation.id,
      });
      return savedConversation;
    } catch (error) {
      this.logger.error('Failed to save conversation', error, {
        service: 'ConversationRepository',
        operation: 'save',
        conversationId: conversation.id,
      });
      throw error;
    }
  }

  async delete(conversationId: number): Promise<void> {
    try {
      await this.repository.delete(conversationId);
      this.logger.debug('Conversation deleted successfully', {
        service: 'ConversationRepository',
        operation: 'delete',
        conversationId,
      });
    } catch (error) {
      this.logger.error('Failed to delete conversation', error, {
        service: 'ConversationRepository',
        operation: 'delete',
        conversationId,
      });
      throw error;
    }
  }

  async updateLastActivity(conversationId: number, lastMessageId?: number): Promise<void> {
    try {
      const updateData: any = { lastActivity: new Date() };
      if (lastMessageId) {
        updateData.lastMessageId = lastMessageId;
      }
      
      await this.repository.update(conversationId, updateData);
      this.logger.debug('Conversation last activity updated', {
        service: 'ConversationRepository',
        operation: 'updateLastActivity',
        conversationId,
        lastMessageId,
      });
    } catch (error) {
      this.logger.error('Failed to update conversation last activity', error, {
        service: 'ConversationRepository',
        operation: 'updateLastActivity',
        conversationId,
        lastMessageId,
      });
      throw error;
    }
  }
}

@Injectable()
export class ConversationQueryRepository implements IConversationQueryRepository {
  constructor(
    @InjectRepository(Conversation)
    private readonly repository: Repository<Conversation>,
    private readonly logger: StructuredLoggerService,
  ) {}

  async findById(conversationId: number): Promise<Conversation | null> {
    try {
      const conversation = await this.repository.findOne({ where: { id: conversationId } });
      return conversation || null;
    } catch (error) {
      this.logger.error('Failed to find conversation by ID', error, {
        service: 'ConversationQueryRepository',
        operation: 'findById',
        conversationId,
      });
      throw error;
    }
  }

  async findByIdWithParticipants(conversationId: number): Promise<Conversation | null> {
    try {
      const conversation = await this.repository.findOne({
        where: { id: conversationId },
        relations: ['participants'],
      });
      return conversation || null;
    } catch (error) {
      this.logger.error('Failed to find conversation with participants', error, {
        service: 'ConversationQueryRepository',
        operation: 'findByIdWithParticipants',
        conversationId,
      });
      throw error;
    }
  }

  async findByParticipant(userId: number, limit?: number, offset?: number): Promise<Conversation[]> {
    try {
      let query = this.repository
        .createQueryBuilder('conversation')
        .innerJoin('conversation.participants', 'participant')
        .where('participant.userId = :userId', { userId })
        .orderBy('conversation.lastActivity', 'DESC');

      if (limit) {
        query = query.limit(limit);
      }
      if (offset) {
        query = query.offset(offset);
      }

      return await query.getMany();
    } catch (error) {
      this.logger.error('Failed to find conversations by participant', error, {
        service: 'ConversationQueryRepository',
        operation: 'findByParticipant',
        userId,
        limit,
        offset,
      });
      throw error;
    }
  }

  async findByType(type: ConversationType, limit?: number): Promise<Conversation[]> {
    try {
      let query = this.repository
        .createQueryBuilder('conversation')
        .where('conversation.type = :type', { type: type.value })
        .orderBy('conversation.lastActivity', 'DESC');

      if (limit) {
        query = query.limit(limit);
      }

      return await query.getMany();
    } catch (error) {
      this.logger.error('Failed to find conversations by type', error, {
        service: 'ConversationQueryRepository',
        operation: 'findByType',
        type: type.value,
        limit,
      });
      throw error;
    }
  }

  async findDirectConversation(user1Id: number, user2Id: number): Promise<Conversation | null> {
    try {
      const conversation = await this.repository
        .createQueryBuilder('conversation')
        .innerJoin('conversation.participants', 'p1')
        .innerJoin('conversation.participants', 'p2')
        .where('conversation.type = :type', { type: 'direct' })
        .andWhere('p1.userId = :user1Id', { user1Id })
        .andWhere('p2.userId = :user2Id', { user2Id })
        .andWhere('p1.userId != p2.userId')
        .getOne();

      return conversation || null;
    } catch (error) {
      this.logger.error('Failed to find direct conversation', error, {
        service: 'ConversationQueryRepository',
        operation: 'findDirectConversation',
        user1Id,
        user2Id,
      });
      throw error;
    }
  }

  async countByParticipant(userId: number): Promise<number> {
    try {
      return await this.repository
        .createQueryBuilder('conversation')
        .innerJoin('conversation.participants', 'participant')
        .where('participant.userId = :userId', { userId })
        .getCount();
    } catch (error) {
      this.logger.error('Failed to count conversations by participant', error, {
        service: 'ConversationQueryRepository',
        operation: 'countByParticipant',
        userId,
      });
      throw error;
    }
  }

  async findRecentConversations(userId: number, limit: number): Promise<Conversation[]> {
    try {
      return await this.repository
        .createQueryBuilder('conversation')
        .innerJoin('conversation.participants', 'participant')
        .where('participant.userId = :userId', { userId })
        .orderBy('conversation.lastActivity', 'DESC')
        .limit(limit)
        .getMany();
    } catch (error) {
      this.logger.error('Failed to find recent conversations', error, {
        service: 'ConversationQueryRepository',
        operation: 'findRecentConversations',
        userId,
        limit,
      });
      throw error;
    }
  }
}

@Injectable()
export class ConversationCommandRepository implements IConversationCommandRepository {
  constructor(
    @InjectRepository(Conversation)
    private readonly repository: Repository<Conversation>,
    private readonly logger: StructuredLoggerService,
  ) {}

  async save(conversation: Conversation): Promise<Conversation> {
    try {
      const savedConversation = await this.repository.save(conversation);
      this.logger.debug('Conversation saved successfully', {
        service: 'ConversationCommandRepository',
        operation: 'save',
        conversationId: savedConversation.id,
      });
      return savedConversation;
    } catch (error) {
      this.logger.error('Failed to save conversation', error, {
        service: 'ConversationCommandRepository',
        operation: 'save',
        conversationId: conversation.id,
      });
      throw error;
    }
  }

  async delete(conversationId: number): Promise<void> {
    try {
      await this.repository.delete(conversationId);
      this.logger.debug('Conversation deleted successfully', {
        service: 'ConversationCommandRepository',
        operation: 'delete',
        conversationId,
      });
    } catch (error) {
      this.logger.error('Failed to delete conversation', error, {
        service: 'ConversationCommandRepository',
        operation: 'delete',
        conversationId,
      });
      throw error;
    }
  }

  async updateLastActivity(conversationId: number, lastMessageId?: number): Promise<void> {
    try {
      const updateData: any = { lastActivity: new Date() };
      if (lastMessageId) {
        updateData.lastMessageId = lastMessageId;
      }
      
      await this.repository.update(conversationId, updateData);
      this.logger.debug('Conversation last activity updated', {
        service: 'ConversationCommandRepository',
        operation: 'updateLastActivity',
        conversationId,
        lastMessageId,
      });
    } catch (error) {
      this.logger.error('Failed to update conversation last activity', error, {
        service: 'ConversationCommandRepository',
        operation: 'updateLastActivity',
        conversationId,
        lastMessageId,
      });
      throw error;
    }
  }

  async bulkUpdateLastActivity(updates: Array<{ conversationId: number; lastMessageId?: number }>): Promise<void> {
    try {
      const promises = updates.map(update => 
        this.updateLastActivity(update.conversationId, update.lastMessageId)
      );
      await Promise.all(promises);
      
      this.logger.debug('Bulk conversation last activity updated', {
        service: 'ConversationCommandRepository',
        operation: 'bulkUpdateLastActivity',
        count: updates.length,
      });
    } catch (error) {
      this.logger.error('Failed to bulk update conversation last activity', error, {
        service: 'ConversationCommandRepository',
        operation: 'bulkUpdateLastActivity',
        count: updates.length,
      });
      throw error;
    }
  }
}