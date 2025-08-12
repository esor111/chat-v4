import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Participant } from '@domain/entities/participant.entity';
import { ParticipantRole } from '@domain/value-objects/participant-role.vo';
import { IParticipantRepository, IParticipantQueryRepository, IParticipantCommandRepository } from '@domain/repositories/participant.repository.interface';
import { StructuredLoggerService } from '@infrastructure/logging/structured-logger.service';

@Injectable()
export class ParticipantRepository implements IParticipantRepository {
  constructor(
    @InjectRepository(Participant)
    private readonly repository: Repository<Participant>,
    private readonly logger: StructuredLoggerService,
  ) {}

  async findByConversationAndUser(conversationId: number, userId: number): Promise<Participant | null> {
    try {
      const participant = await this.repository.findOne({
        where: { conversationId, userId },
      });
      return participant || null;
    } catch (error) {
      this.logger.error('Failed to find participant by conversation and user', error, {
        service: 'ParticipantRepository',
        operation: 'findByConversationAndUser',
        conversationId,
        userId,
      });
      throw error;
    }
  }

  async findByConversation(conversationId: number): Promise<Participant[]> {
    try {
      return await this.repository.find({ where: { conversationId } });
    } catch (error) {
      this.logger.error('Failed to find participants by conversation', error, {
        service: 'ParticipantRepository',
        operation: 'findByConversation',
        conversationId,
      });
      throw error;
    }
  }

  async findByUser(userId: number): Promise<Participant[]> {
    try {
      return await this.repository.find({ where: { userId } });
    } catch (error) {
      this.logger.error('Failed to find participants by user', error, {
        service: 'ParticipantRepository',
        operation: 'findByUser',
        userId,
      });
      throw error;
    }
  }

  async save(participant: Participant): Promise<Participant> {
    try {
      const savedParticipant = await this.repository.save(participant);
      this.logger.debug('Participant saved successfully', {
        service: 'ParticipantRepository',
        operation: 'save',
        conversationId: savedParticipant.conversationId,
        userId: savedParticipant.userId,
      });
      return savedParticipant;
    } catch (error) {
      this.logger.error('Failed to save participant', error, {
        service: 'ParticipantRepository',
        operation: 'save',
        conversationId: participant.conversationId,
        userId: participant.userId,
      });
      throw error;
    }
  }

  async delete(conversationId: number, userId: number): Promise<void> {
    try {
      await this.repository.delete({ conversationId, userId });
      this.logger.debug('Participant deleted successfully', {
        service: 'ParticipantRepository',
        operation: 'delete',
        conversationId,
        userId,
      });
    } catch (error) {
      this.logger.error('Failed to delete participant', error, {
        service: 'ParticipantRepository',
        operation: 'delete',
        conversationId,
        userId,
      });
      throw error;
    }
  }

  async updateLastReadMessage(conversationId: number, userId: number, messageId: number): Promise<void> {
    try {
      await this.repository.update(
        { conversationId, userId },
        { lastReadMessageId: messageId }
      );
      this.logger.debug('Participant last read message updated', {
        service: 'ParticipantRepository',
        operation: 'updateLastReadMessage',
        conversationId,
        userId,
        messageId,
      });
    } catch (error) {
      this.logger.error('Failed to update participant last read message', error, {
        service: 'ParticipantRepository',
        operation: 'updateLastReadMessage',
        conversationId,
        userId,
        messageId,
      });
      throw error;
    }
  }
}

@Injectable()
export class ParticipantQueryRepository implements IParticipantQueryRepository {
  constructor(
    @InjectRepository(Participant)
    private readonly repository: Repository<Participant>,
    private readonly logger: StructuredLoggerService,
  ) {}

  async findByConversationAndUser(conversationId: number, userId: number): Promise<Participant | null> {
    try {
      const participant = await this.repository.findOne({
        where: { conversationId, userId },
      });
      return participant || null;
    } catch (error) {
      this.logger.error('Failed to find participant by conversation and user', error, {
        service: 'ParticipantQueryRepository',
        operation: 'findByConversationAndUser',
        conversationId,
        userId,
      });
      throw error;
    }
  }

  async findByConversation(conversationId: number): Promise<Participant[]> {
    try {
      return await this.repository.find({ where: { conversationId } });
    } catch (error) {
      this.logger.error('Failed to find participants by conversation', error, {
        service: 'ParticipantQueryRepository',
        operation: 'findByConversation',
        conversationId,
      });
      throw error;
    }
  }

  async findByUser(userId: number): Promise<Participant[]> {
    try {
      return await this.repository.find({ where: { userId } });
    } catch (error) {
      this.logger.error('Failed to find participants by user', error, {
        service: 'ParticipantQueryRepository',
        operation: 'findByUser',
        userId,
      });
      throw error;
    }
  }

  async findByRole(role: ParticipantRole): Promise<Participant[]> {
    try {
      return await this.repository
        .createQueryBuilder('participant')
        .where('participant.role = :role', { role: role.value })
        .getMany();
    } catch (error) {
      this.logger.error('Failed to find participants by role', error, {
        service: 'ParticipantQueryRepository',
        operation: 'findByRole',
        role: role.value,
      });
      throw error;
    }
  }

  async findUnreadCounts(userId: number): Promise<Array<{ conversationId: number; unreadCount: number }>> {
    try {
      const results = await this.repository
        .createQueryBuilder('participant')
        .select('participant.conversationId', 'conversationId')
        .addSelect('COUNT(message.id)', 'unreadCount')
        .leftJoin('messages', 'message', 
          'message.conversationId = participant.conversationId AND message.id > COALESCE(participant.lastReadMessageId, 0) AND message.deletedAt IS NULL'
        )
        .where('participant.userId = :userId', { userId })
        .groupBy('participant.conversationId')
        .getRawMany();

      return results.map(result => ({
        conversationId: parseInt(result.conversationId),
        unreadCount: parseInt(result.unreadCount) || 0,
      }));
    } catch (error) {
      this.logger.error('Failed to find unread counts', error, {
        service: 'ParticipantQueryRepository',
        operation: 'findUnreadCounts',
        userId,
      });
      throw error;
    }
  }

  async isParticipant(conversationId: number, userId: number): Promise<boolean> {
    try {
      const count = await this.repository.count({
        where: { conversationId, userId },
      });
      return count > 0;
    } catch (error) {
      this.logger.error('Failed to check if user is participant', error, {
        service: 'ParticipantQueryRepository',
        operation: 'isParticipant',
        conversationId,
        userId,
      });
      throw error;
    }
  }

  async countByConversation(conversationId: number): Promise<number> {
    try {
      return await this.repository.count({ where: { conversationId } });
    } catch (error) {
      this.logger.error('Failed to count participants by conversation', error, {
        service: 'ParticipantQueryRepository',
        operation: 'countByConversation',
        conversationId,
      });
      throw error;
    }
  }
}

@Injectable()
export class ParticipantCommandRepository implements IParticipantCommandRepository {
  constructor(
    @InjectRepository(Participant)
    private readonly repository: Repository<Participant>,
    private readonly logger: StructuredLoggerService,
  ) {}

  async save(participant: Participant): Promise<Participant> {
    try {
      const savedParticipant = await this.repository.save(participant);
      this.logger.debug('Participant saved successfully', {
        service: 'ParticipantCommandRepository',
        operation: 'save',
        conversationId: savedParticipant.conversationId,
        userId: savedParticipant.userId,
      });
      return savedParticipant;
    } catch (error) {
      this.logger.error('Failed to save participant', error, {
        service: 'ParticipantCommandRepository',
        operation: 'save',
        conversationId: participant.conversationId,
        userId: participant.userId,
      });
      throw error;
    }
  }

  async delete(conversationId: number, userId: number): Promise<void> {
    try {
      await this.repository.delete({ conversationId, userId });
      this.logger.debug('Participant deleted successfully', {
        service: 'ParticipantCommandRepository',
        operation: 'delete',
        conversationId,
        userId,
      });
    } catch (error) {
      this.logger.error('Failed to delete participant', error, {
        service: 'ParticipantCommandRepository',
        operation: 'delete',
        conversationId,
        userId,
      });
      throw error;
    }
  }

  async bulkSave(participants: Participant[]): Promise<Participant[]> {
    try {
      if (participants.length === 0) return [];
      
      const savedParticipants = await this.repository.save(participants);
      this.logger.debug('Participants bulk saved successfully', {
        service: 'ParticipantCommandRepository',
        operation: 'bulkSave',
        count: savedParticipants.length,
      });
      return savedParticipants;
    } catch (error) {
      this.logger.error('Failed to bulk save participants', error, {
        service: 'ParticipantCommandRepository',
        operation: 'bulkSave',
        count: participants.length,
      });
      throw error;
    }
  }

  async updateLastReadMessage(conversationId: number, userId: number, messageId: number): Promise<void> {
    try {
      await this.repository.update(
        { conversationId, userId },
        { lastReadMessageId: messageId }
      );
      this.logger.debug('Participant last read message updated', {
        service: 'ParticipantCommandRepository',
        operation: 'updateLastReadMessage',
        conversationId,
        userId,
        messageId,
      });
    } catch (error) {
      this.logger.error('Failed to update participant last read message', error, {
        service: 'ParticipantCommandRepository',
        operation: 'updateLastReadMessage',
        conversationId,
        userId,
        messageId,
      });
      throw error;
    }
  }

  async updateRole(conversationId: number, userId: number, role: ParticipantRole): Promise<void> {
    try {
      await this.repository.update(
        { conversationId, userId },
        { role }
      );
      this.logger.debug('Participant role updated', {
        service: 'ParticipantCommandRepository',
        operation: 'updateRole',
        conversationId,
        userId,
        role: role.value,
      });
    } catch (error) {
      this.logger.error('Failed to update participant role', error, {
        service: 'ParticipantCommandRepository',
        operation: 'updateRole',
        conversationId,
        userId,
        role: role.value,
      });
      throw error;
    }
  }

  async toggleMute(conversationId: number, userId: number, isMuted: boolean): Promise<void> {
    try {
      await this.repository.update(
        { conversationId, userId },
        { isMuted }
      );
      this.logger.debug('Participant mute status updated', {
        service: 'ParticipantCommandRepository',
        operation: 'toggleMute',
        conversationId,
        userId,
        isMuted,
      });
    } catch (error) {
      this.logger.error('Failed to update participant mute status', error, {
        service: 'ParticipantCommandRepository',
        operation: 'toggleMute',
        conversationId,
        userId,
        isMuted,
      });
      throw error;
    }
  }
}