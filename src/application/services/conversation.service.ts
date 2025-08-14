import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '@domain/entities/conversation.entity';
import { Participant } from '@domain/entities/participant.entity';
import { User } from '@domain/entities/user.entity';
import { ConversationType } from '@domain/value-objects/conversation-type.vo';
import { ParticipantRole } from '@domain/value-objects/participant-role.vo';
import { ConversationFactory } from '@domain/factories/conversation.factory';
import { StructuredLoggerService } from '@infrastructure/logging/structured-logger.service';

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Participant)
    private readonly participantRepository: Repository<Participant>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly logger: StructuredLoggerService,
  ) {}

  async createConversation(params: {
    type: string;
    createdBy: string;
    participants: Array<{ userId: string; role: string }>;
    title?: string;
    description?: string;
  }): Promise<Conversation> {
    this.logger.log('Creating conversation', {
      service: 'ConversationService',
      operation: 'createConversation',
      type: params.type,
      createdBy: params.createdBy,
      participantCount: params.participants.length,
    });

    // Validate that all users exist
    const userIds = params.participants.map(p => p.userId);
    const users = await this.userRepository.findByIds(userIds);
    if (users.length !== userIds.length) {
      throw new Error('One or more participants do not exist');
    }

    // Use factory to create conversation with validation
    const { conversation, participants } = ConversationFactory.create(params);

    // Save conversation
    const savedConversation = await this.conversationRepository.save(conversation);

    // Save participants with the correct conversation ID
    const participantsToSave = participants.map(p => {
      p.conversationId = savedConversation.id;
      return p;
    });
    await this.participantRepository.save(participantsToSave);

    this.logger.audit('Conversation created', {
      conversationId: savedConversation.id,
      type: params.type,
      createdBy: params.createdBy,
    });

    return savedConversation;
  }

  async addParticipant(
    conversationId: string,
    userId: string,
    role: string,
    addedBy: string,
  ): Promise<void> {
    this.logger.log('Adding participant to conversation', {
      service: 'ConversationService',
      operation: 'addParticipant',
      conversationId,
      userId,
      role,
      addedBy,
    });

    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['participants'],
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Validate user exists
    const user = await this.userRepository.findOne({ where: { userId: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    // Business rule validations
    this.validateAddParticipant(conversation, userId, role);

    // Create and save participant
    const participant = new Participant();
    participant.conversationId = conversationId;
    participant.userId = userId;
    participant.role = ParticipantRole.fromString(role);
    participant.isMuted = false;

    await this.participantRepository.save(participant);

    // Update conversation last activity
    conversation.lastActivity = new Date();
    await this.conversationRepository.save(conversation);

    this.logger.audit('Participant added to conversation', {
      conversationId,
      userId,
      role,
      addedBy,
    });
  }

  async removeParticipant(
    conversationId: string,
    userId: string,
    removedBy: string,
    reason?: string,
  ): Promise<void> {
    this.logger.log('Removing participant from conversation', {
      service: 'ConversationService',
      operation: 'removeParticipant',
      conversationId,
      userId,
      removedBy,
      reason,
    });

    const conversation = await this.conversationRepository.findOne({
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

    await this.participantRepository.remove(participant);

    // Update conversation last activity
    conversation.lastActivity = new Date();
    await this.conversationRepository.save(conversation);

    this.logger.audit('Participant removed from conversation', {
      conversationId,
      userId,
      removedBy,
      reason,
    });
  }

  async getConversation(conversationId: string, userId: string): Promise<Conversation | null> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['participants', 'messages'],
    });

    if (!conversation) {
      return null;
    }

    // Check if user is a participant
    const isParticipant = conversation.participants.some(p => p.userId === userId);
    if (!isParticipant) {
      throw new Error('User is not authorized to access this conversation');
    }

    return conversation;
  }

  async getUserConversations(userId: string): Promise<Conversation[]> {
    const conversations = await this.conversationRepository
      .createQueryBuilder('conversation')
      .innerJoin('conversation.participants', 'participant')
      .where('participant.userId = :userId', { userId })
      .orderBy('conversation.lastActivity', 'DESC')
      .getMany();

    return conversations;
  }

  private validateAddParticipant(conversation: Conversation, userId: string, role: string): void {
    // Check if user is already a participant
    const existingParticipant = conversation.participants.find(p => p.userId === userId);
    if (existingParticipant) {
      throw new Error('User is already a participant in this conversation');
    }

    // Validate participant limits based on conversation type
    const conversationType = conversation.type;
    
    if (conversationType.isDirect() && conversation.participants.length >= 2) {
      throw new Error('Direct conversations can only have 2 participants');
    }

    if (conversationType.isGroup() && conversation.participants.length >= 8) {
      throw new Error('Group conversations cannot have more than 8 participants');
    }

    // Validate role for conversation type
    const participantRole = ParticipantRole.fromString(role);
    
    if (conversationType.isDirect() && !participantRole.isMember()) {
      throw new Error('Direct conversations can only have member participants');
    }

    if (conversationType.isBusiness()) {
      const validBusinessRoles = ['customer', 'agent', 'business'];
      if (!validBusinessRoles.includes(participantRole.value)) {
        throw new Error('Business conversations require customer, agent, or business roles');
      }
    }
  }
}