import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Conversation } from '@domain/entities/conversation.entity';
import { Participant } from '@domain/entities/participant.entity';
import { User } from '@domain/entities/user.entity';
import { ConversationType } from '@domain/value-objects/conversation-type.vo';
import { ParticipantRole } from '@domain/value-objects/participant-role.vo';
import { StructuredLoggerService } from '@infrastructure/logging/structured-logger.service';

export interface CreateConversationParams {
  type: ConversationType;
  createdBy: string;
  participants: Array<{ userId: string; role: ParticipantRole }>;
  title?: string;
  description?: string;
}

export interface ConversationWithMetadata extends Conversation {
  participantCount: number;
  unreadCount?: number;
  lastMessagePreview?: string;
}

@Injectable()
export class EnhancedConversationRepository {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Participant)
    private readonly participantRepository: Repository<Participant>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly logger: StructuredLoggerService,
  ) {}

  async createConversationWithParticipants(params: CreateConversationParams): Promise<Conversation> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log('Creating conversation with participants', {
        service: 'EnhancedConversationRepository',
        operation: 'createConversationWithParticipants',
        type: params.type.value,
        createdBy: params.createdBy,
        participantCount: params.participants.length,
      });

      // Validate participants exist
      const userIds = params.participants.map(p => p.userId);
      const users = await queryRunner.manager.findByIds(User, userIds);

      if (users.length !== userIds.length) {
        throw new Error('One or more participants do not exist');
      }

      // Validate conversation type constraints
      this.validateConversationConstraints(params);

      // Create conversation
      const conversation = new Conversation();
      conversation.type = params.type;
      conversation.lastActivity = new Date();

      const savedConversation = await queryRunner.manager.save(Conversation, conversation);

      // Create participants
      const participants = params.participants.map(p => {
        const participant = new Participant();
        participant.conversationId = savedConversation.id;
        participant.userId = p.userId;
        participant.role = p.role;
        participant.isMuted = false;
        return participant;
      });

      await queryRunner.manager.save(Participant, participants);

      await queryRunner.commitTransaction();

      this.logger.audit('Conversation created with participants', {
        conversationId: savedConversation.id,
        type: params.type.value,
        createdBy: params.createdBy,
        participantCount: participants.length,
      });

      return savedConversation;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to create conversation with participants', error, {
        service: 'EnhancedConversationRepository',
        operation: 'createConversationWithParticipants',
        type: params.type.value,
        createdBy: params.createdBy,
      });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async addParticipantToConversation(
    conversationId: string,
    userId: string,
    role: ParticipantRole,
    addedBy: string,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log('Adding participant to conversation', {
        service: 'EnhancedConversationRepository',
        operation: 'addParticipantToConversation',
        conversationId,
        userId,
        role: role.value,
        addedBy,
      });

      // Get conversation with participants
      const conversation = await queryRunner.manager.findOne(Conversation, {
        where: { id: conversationId },
        relations: ['participants'],
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Validate user exists
      const user = await queryRunner.manager.findOne(User, { where: { id: userId } });
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user is already a participant
      const existingParticipant = conversation.participants.find(p => p.userId === userId);
      if (existingParticipant) {
        throw new Error('User is already a participant in this conversation');
      }

      // Validate conversation type constraints
      this.validateAddParticipantConstraints(conversation, role);

      // Create new participant
      const participant = new Participant();
      participant.conversationId = conversationId;
      participant.userId = userId;
      participant.role = role;
      participant.isMuted = false;

      await queryRunner.manager.save(Participant, participant);

      // Update conversation last activity
      conversation.lastActivity = new Date();
      await queryRunner.manager.save(Conversation, conversation);

      await queryRunner.commitTransaction();

      this.logger.audit('Participant added to conversation', {
        conversationId,
        userId,
        role: role.value,
        addedBy,
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to add participant to conversation', error, {
        service: 'EnhancedConversationRepository',
        operation: 'addParticipantToConversation',
        conversationId,
        userId,
        role: role.value,
        addedBy,
      });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async removeParticipantFromConversation(
    conversationId: string,
    userId: string,
    removedBy: string,
    reason?: string,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log('Removing participant from conversation', {
        service: 'EnhancedConversationRepository',
        operation: 'removeParticipantFromConversation',
        conversationId,
        userId,
        removedBy,
        reason,
      });

      // Get conversation with participants
      const conversation = await queryRunner.manager.findOne(Conversation, {
        where: { id: conversationId },
        relations: ['participants'],
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const participant = conversation.participants.find(p => p.userId === userId);
      if (!participant) {
        throw new Error('User is not a participant in this conversation');
      }

      // Business rule: Cannot remove the last participant
      if (conversation.participants.length === 1) {
        throw new Error('Cannot remove the last participant from a conversation');
      }

      // Remove participant
      await queryRunner.manager.delete(Participant, {
        conversationId,
        userId,
      });

      // Update conversation last activity
      conversation.lastActivity = new Date();
      await queryRunner.manager.save(Conversation, conversation);

      await queryRunner.commitTransaction();

      this.logger.audit('Participant removed from conversation', {
        conversationId,
        userId,
        removedBy,
        reason,
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to remove participant from conversation', error, {
        service: 'EnhancedConversationRepository',
        operation: 'removeParticipantFromConversation',
        conversationId,
        userId,
        removedBy,
      });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findDirectConversationBetweenUsers(user1Id: string, user2Id: string): Promise<Conversation | null> {
    try {
      const conversation = await this.conversationRepository
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
      this.logger.error('Failed to find direct conversation between users', error, {
        service: 'EnhancedConversationRepository',
        operation: 'findDirectConversationBetweenUsers',
        user1Id,
        user2Id,
      });
      throw error;
    }
  }

  async findGroupConversationsByUser(userId: string, limit: number = 50): Promise<Conversation[]> {
    try {
      return await this.conversationRepository
        .createQueryBuilder('conversation')
        .innerJoin('conversation.participants', 'participant')
        .where('conversation.type = :type', { type: 'group' })
        .andWhere('participant.userId = :userId', { userId })
        .orderBy('conversation.lastActivity', 'DESC')
        .limit(limit)
        .getMany();
    } catch (error) {
      this.logger.error('Failed to find group conversations by user', error, {
        service: 'EnhancedConversationRepository',
        operation: 'findGroupConversationsByUser',
        userId,
        limit,
      });
      throw error;
    }
  }

  async findBusinessConversationsByUser(userId: string, limit: number = 50): Promise<Conversation[]> {
    try {
      return await this.conversationRepository
        .createQueryBuilder('conversation')
        .innerJoin('conversation.participants', 'participant')
        .where('conversation.type = :type', { type: 'business' })
        .andWhere('participant.userId = :userId', { userId })
        .orderBy('conversation.lastActivity', 'DESC')
        .limit(limit)
        .getMany();
    } catch (error) {
      this.logger.error('Failed to find business conversations by user', error, {
        service: 'EnhancedConversationRepository',
        operation: 'findBusinessConversationsByUser',
        userId,
        limit,
      });
      throw error;
    }
  }

  async getConversationWithMetadata(conversationId: string, userId: string): Promise<ConversationWithMetadata | null> {
    try {
      const result = await this.conversationRepository
        .createQueryBuilder('conversation')
        .leftJoinAndSelect('conversation.participants', 'participants')
        .leftJoinAndSelect('conversation.lastMessage', 'lastMessage')
        .leftJoin('conversation.participants', 'userParticipant', 'userParticipant.userId = :userId', { userId })
        .leftJoin('messages', 'unreadMessages', 
          'unreadMessages.conversationId = conversation.id AND unreadMessages.id > COALESCE(userParticipant.lastReadMessageId, 0) AND unreadMessages.deletedAt IS NULL'
        )
        .select([
          'conversation',
          'participants',
          'lastMessage.content',
          'COUNT(DISTINCT participants.userId) as participantCount',
          'COUNT(DISTINCT unreadMessages.id) as unreadCount',
        ])
        .where('conversation.id = :conversationId', { conversationId })
        .andWhere('userParticipant.userId IS NOT NULL') // Ensure user is a participant
        .groupBy('conversation.id')
        .addGroupBy('participants.conversationId')
        .addGroupBy('participants.userId')
        .addGroupBy('lastMessage.id')
        .getRawAndEntities();

      if (!result.entities.length) {
        return null;
      }

      const conversation = result.entities[0] as ConversationWithMetadata;
      const raw = result.raw[0];
      
      conversation.participantCount = parseInt(raw.participantCount) || 0;
      conversation.unreadCount = parseInt(raw.unreadCount) || 0;
      conversation.lastMessagePreview = raw.lastMessage_content || null;

      return conversation;
    } catch (error) {
      this.logger.error('Failed to get conversation with metadata', error, {
        service: 'EnhancedConversationRepository',
        operation: 'getConversationWithMetadata',
        conversationId,
        userId,
      });
      throw error;
    }
  }

  async updateLastActivityAndMessage(conversationId: string, messageId: string): Promise<void> {
    try {
      await this.conversationRepository.update(conversationId, {
        lastMessageId: messageId,
        lastActivity: new Date(),
      });

      this.logger.debug('Conversation last activity and message updated', {
        service: 'EnhancedConversationRepository',
        operation: 'updateLastActivityAndMessage',
        conversationId,
        messageId,
      });
    } catch (error) {
      this.logger.error('Failed to update conversation last activity and message', error, {
        service: 'EnhancedConversationRepository',
        operation: 'updateLastActivityAndMessage',
        conversationId,
        messageId,
      });
      throw error;
    }
  }

  private validateConversationConstraints(params: CreateConversationParams): void {
    if (params.type.isDirect()) {
      if (params.participants.length !== 2) {
        throw new Error('Direct conversations must have exactly 2 participants');
      }
      
      // All participants in direct conversations should be members
      const nonMembers = params.participants.filter(p => !p.role.isMember());
      if (nonMembers.length > 0) {
        throw new Error('Direct conversations can only have member participants');
      }
    }

    if (params.type.isGroup()) {
      if (params.participants.length > 8) {
        throw new Error('Group conversations cannot have more than 8 participants');
      }
      
      if (params.participants.length < 2) {
        throw new Error('Group conversations must have at least 2 participants');
      }
    }

    if (params.type.isBusiness()) {
      const hasCustomer = params.participants.some(p => p.role.isCustomer());
      const hasBusiness = params.participants.some(p => p.role.isBusiness());
      
      if (!hasCustomer || !hasBusiness) {
        throw new Error('Business conversations must have at least one customer and one business participant');
      }
    }

    // Check for duplicate participants
    const userIds = params.participants.map(p => p.userId);
    const uniqueUserIds = new Set(userIds);
    if (userIds.length !== uniqueUserIds.size) {
      throw new Error('Duplicate participants are not allowed');
    }

    // Validate creator is in participants
    const creatorIsParticipant = params.participants.some(p => p.userId === params.createdBy);
    if (!creatorIsParticipant) {
      throw new Error('Creator must be included in participants');
    }
  }

  private validateAddParticipantConstraints(conversation: Conversation, role: ParticipantRole): void {
    if (conversation.type.isDirect()) {
      throw new Error('Cannot add participants to direct conversations');
    }

    if (conversation.type.isGroup() && conversation.participants.length >= 8) {
      throw new Error('Group conversations cannot have more than 8 participants');
    }

    if (conversation.type.isBusiness()) {
      const validBusinessRoles = ['customer', 'agent', 'business'];
      if (!validBusinessRoles.includes(role.value)) {
        throw new Error('Business conversations require customer, agent, or business roles');
      }
    }
  }
}