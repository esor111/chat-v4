import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
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

  async findById(conversationId: string): Promise<Conversation | null> {
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

  async findByIds(conversationIds: string[], options?: { limit?: number; offset?: number }): Promise<Conversation[]> {
    try {
      if (conversationIds.length === 0) {
        return [];
      }

      const { limit, offset } = options || {};
      
      let query = this.repository
        .createQueryBuilder('conversation')
        .where('conversation.conversation_id IN (:...ids)', { ids: conversationIds.map(id => parseInt(id)) })
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

  async findByParticipant(userId: string): Promise<Conversation[]> {
    try {
      return await this.repository
        .createQueryBuilder('conversation')
        .innerJoin('participants', 'participant', 'participant.conversation_id = conversation.id')
        .where('participant.user_id = :userId', { userId })
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
      });
      throw error;
    }
  }

  async delete(conversationId: string): Promise<void> {
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

  async updateLastActivity(conversationId: string, lastMessageId?: string): Promise<void> {
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

  async findById(conversationId: string): Promise<Conversation | null> {
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

  async findByIdWithParticipants(conversationId: string): Promise<Conversation | null> {
    try {
      const conversation = await this.repository
        .createQueryBuilder('conversation')
        .leftJoinAndSelect('conversation.participants', 'participants')
        .where('conversation.id = :conversationId', { conversationId })
        .getOne();
      
      return conversation || null;
    } catch (error) {
      this.logger.error('Failed to find conversation by ID with participants', error, {
        service: 'ConversationQueryRepository',
        operation: 'findByIdWithParticipants',
        conversationId,
      });
      throw error;
    }
  }

  async findByParticipant(userId: string, limit?: number, offset?: number): Promise<Conversation[]> {
    try {
      let query = this.repository
        .createQueryBuilder('conversation')
        .innerJoin('participants', 'participant', 'participant.conversation_id = conversation.id')
        .where('participant.user_id = :userId', { userId })
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
      return await this.repository.find({
        where: { type },
        order: { lastActivity: 'DESC' },
        take: limit,
      });
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

  async findDirectConversation(user1Id: string, user2Id: string): Promise<Conversation | null> {
    try {
      const conversation = await this.repository
        .createQueryBuilder('conversation')
        .innerJoin('participants', 'p1', 'p1.conversation_id = conversation.id AND p1.user_id = :user1Id', { user1Id })
        .innerJoin('participants', 'p2', 'p2.conversation_id = conversation.id AND p2.user_id = :user2Id', { user2Id })
        .where('conversation.type = :type', { type: 'direct' })
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

  async countByParticipant(userId: string): Promise<number> {
    try {
      return await this.repository
        .createQueryBuilder('conversation')
        .innerJoin('participants', 'participant', 'participant.conversation_id = conversation.id')
        .where('participant.user_id = :userId', { userId })
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

  async findRecentConversations(userId: string, limit: number): Promise<Conversation[]> {
    try {
      return await this.repository
        .createQueryBuilder('conversation')
        .innerJoin('participants', 'participant', 'participant.conversation_id = conversation.id')
        .where('participant.user_id = :userId', { userId })
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
      });
      throw error;
    }
  }

  async delete(conversationId: string): Promise<void> {
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

  async updateLastActivity(conversationId: string, lastMessageId?: string): Promise<void> {
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

  async bulkUpdateLastActivity(updates: Array<{ conversationId: string; lastMessageId?: string }>): Promise<void> {
    try {
      const promises = updates.map(update => 
        this.updateLastActivity(update.conversationId, update.lastMessageId)
      );
      
      await Promise.all(promises);
      
      this.logger.debug('Conversations bulk updated successfully', {
        service: 'ConversationCommandRepository',
        operation: 'bulkUpdateLastActivity',
        count: updates.length,
      });
    } catch (error) {
      this.logger.error('Failed to bulk update conversations', error, {
        service: 'ConversationCommandRepository',
        operation: 'bulkUpdateLastActivity',
        count: updates.length,
      });
      throw error;
    }
  }
}