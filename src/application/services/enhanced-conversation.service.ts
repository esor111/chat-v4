import { Injectable, Inject } from '@nestjs/common';
import { EnhancedConversationRepository, CreateConversationParams, ConversationWithMetadata } from '@infrastructure/repositories/enhanced-conversation.repository';
import { IUserQueryRepository } from '@domain/repositories/user.repository.interface';
import { ConversationType } from '@domain/value-objects/conversation-type.vo';
import { ParticipantRole } from '@domain/value-objects/participant-role.vo';
import { Conversation } from '@domain/entities/conversation.entity';
import { StructuredLoggerService } from '@infrastructure/logging/structured-logger.service';

export interface CreateDirectConversationRequest {
  user1Id: string;
  user2Id: string;
  createdBy: string;
}

export interface CreateGroupConversationRequest {
  participantIds: string[];
  createdBy: string;
  title?: string;
  description?: string;
}

export interface CreateBusinessConversationRequest {
  customerId: string;
  businessId: string;
  agentId?: string;
}

@Injectable()
export class EnhancedConversationService {
  constructor(
    private readonly conversationRepository: EnhancedConversationRepository,
    @Inject('IUserQueryRepository')
    private readonly userQueryRepository: IUserQueryRepository,
    private readonly logger: StructuredLoggerService,
  ) {}

  async createDirectConversation(request: CreateDirectConversationRequest): Promise<Conversation> {
    this.logger.log('Creating direct conversation', {
      service: 'EnhancedConversationService',
      operation: 'createDirectConversation',
      user1Id: request.user1Id,
      user2Id: request.user2Id,
      createdBy: request.createdBy,
    });

    // Check if direct conversation already exists
    const existingConversation = await this.conversationRepository.findDirectConversationBetweenUsers(
      request.user1Id,
      request.user2Id,
    );

    if (existingConversation) {
      this.logger.debug('Direct conversation already exists', {
        service: 'EnhancedConversationService',
        operation: 'createDirectConversation',
        conversationId: existingConversation.id,
      });
      return existingConversation;
    }

    // Validate users exist
    const users = await this.userQueryRepository.findByIds([request.user1Id, request.user2Id]);
    if (users.length !== 2) {
      throw new Error('One or both users do not exist');
    }

    const params: CreateConversationParams = {
      type: ConversationType.DIRECT,
      createdBy: request.createdBy,
      participants: [
        { userId: request.user1Id, role: ParticipantRole.MEMBER },
        { userId: request.user2Id, role: ParticipantRole.MEMBER },
      ],
    };

    const conversation = await this.conversationRepository.createConversationWithParticipants(params);

    this.logger.audit('Direct conversation created', {
      conversationId: conversation.id,
      user1Id: request.user1Id,
      user2Id: request.user2Id,
      createdBy: request.createdBy,
    });

    return conversation;
  }

  async createGroupConversation(request: CreateGroupConversationRequest): Promise<Conversation> {
    this.logger.log('Creating group conversation', {
      service: 'EnhancedConversationService',
      operation: 'createGroupConversation',
      participantIds: request.participantIds,
      createdBy: request.createdBy,
      title: request.title,
    });

    // Validate participants
    if (request.participantIds.length > 8) {
      throw new Error('Group conversations cannot have more than 8 participants');
    }

    if (request.participantIds.length < 2) {
      throw new Error('Group conversations must have at least 2 participants');
    }

    // Validate users exist
    const users = await this.userQueryRepository.findByIds(request.participantIds);
    if (users.length !== request.participantIds.length) {
      throw new Error('One or more participants do not exist');
    }

    // Create participants with roles (creator is admin, others are members)
    const participants = request.participantIds.map(userId => ({
      userId,
      role: userId === request.createdBy ? ParticipantRole.ADMIN : ParticipantRole.MEMBER,
    }));

    const params: CreateConversationParams = {
      type: ConversationType.GROUP,
      createdBy: request.createdBy,
      participants,
      title: request.title,
      description: request.description,
    };

    const conversation = await this.conversationRepository.createConversationWithParticipants(params);

    this.logger.audit('Group conversation created', {
      conversationId: conversation.id,
      participantIds: request.participantIds,
      createdBy: request.createdBy,
      title: request.title,
    });

    return conversation;
  }

  async createBusinessConversation(request: CreateBusinessConversationRequest): Promise<Conversation> {
    this.logger.log('Creating business conversation', {
      service: 'EnhancedConversationService',
      operation: 'createBusinessConversation',
      customerId: request.customerId,
      businessId: request.businessId,
      agentId: request.agentId,
    });

    // Validate users exist
    const userIds = [request.customerId, request.businessId];
    if (request.agentId) {
      userIds.push(request.agentId);
    }

    const users = await this.userQueryRepository.findByIds(userIds);
    if (users.length !== userIds.length) {
      throw new Error('One or more participants do not exist');
    }

    // Create participants with appropriate roles
    const participants = [
      { userId: request.customerId, role: ParticipantRole.CUSTOMER },
      { userId: request.businessId, role: ParticipantRole.BUSINESS },
    ];

    if (request.agentId) {
      participants.push({ userId: request.agentId, role: ParticipantRole.AGENT });
    }

    const params: CreateConversationParams = {
      type: ConversationType.BUSINESS,
      createdBy: request.customerId,
      participants,
    };

    const conversation = await this.conversationRepository.createConversationWithParticipants(params);

    this.logger.audit('Business conversation created', {
      conversationId: conversation.id,
      customerId: request.customerId,
      businessId: request.businessId,
      agentId: request.agentId,
    });

    return conversation;
  }

  async addParticipantToConversation(
    conversationId: string,
    userId: string,
    role: string,
    addedBy: string,
  ): Promise<void> {
    this.logger.log('Adding participant to conversation', {
      service: 'EnhancedConversationService',
      operation: 'addParticipantToConversation',
      conversationId,
      userId,
      role,
      addedBy,
    });

    // Validate user exists
    const user = await this.userQueryRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const participantRole = ParticipantRole.fromString(role);
    await this.conversationRepository.addParticipantToConversation(
      conversationId,
      userId,
      participantRole,
      addedBy,
    );

    this.logger.audit('Participant added to conversation', {
      conversationId,
      userId,
      role,
      addedBy,
    });
  }

  async removeParticipantFromConversation(
    conversationId: string,
    userId: string,
    removedBy: string,
    reason?: string,
  ): Promise<void> {
    this.logger.log('Removing participant from conversation', {
      service: 'EnhancedConversationService',
      operation: 'removeParticipantFromConversation',
      conversationId,
      userId,
      removedBy,
      reason,
    });

    await this.conversationRepository.removeParticipantFromConversation(
      conversationId,
      userId,
      removedBy,
      reason,
    );

    this.logger.audit('Participant removed from conversation', {
      conversationId,
      userId,
      removedBy,
      reason,
    });
  }

  async getUserConversations(userId: string, type?: string): Promise<Conversation[]> {
    this.logger.log('Getting user conversations', {
      service: 'EnhancedConversationService',
      operation: 'getUserConversations',
      userId,
      type,
    });

    if (type === 'direct') {
      // For direct conversations, we can use the general method since they're mixed with others
      // In a real implementation, you might want to add a specific method
      return [];
    } else if (type === 'group') {
      return await this.conversationRepository.findGroupConversationsByUser(userId);
    } else if (type === 'business') {
      return await this.conversationRepository.findBusinessConversationsByUser(userId);
    } else {
      // Return all conversations - this would need to be implemented in the repository
      const [groupConversations, businessConversations] = await Promise.all([
        this.conversationRepository.findGroupConversationsByUser(userId),
        this.conversationRepository.findBusinessConversationsByUser(userId),
      ]);
      
      // Combine and sort by last activity
      const allConversations = [...groupConversations, ...businessConversations];
      return allConversations.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
    }
  }

  async getConversationWithMetadata(conversationId: string, userId: string): Promise<ConversationWithMetadata | null> {
    this.logger.log('Getting conversation with metadata', {
      service: 'EnhancedConversationService',
      operation: 'getConversationWithMetadata',
      conversationId,
      userId,
    });

    return await this.conversationRepository.getConversationWithMetadata(conversationId, userId);
  }

  async updateConversationActivity(conversationId: string, messageId: string): Promise<void> {
    this.logger.debug('Updating conversation activity', {
      service: 'EnhancedConversationService',
      operation: 'updateConversationActivity',
      conversationId,
      messageId,
    });

    await this.conversationRepository.updateLastActivityAndMessage(conversationId, messageId);
  }
}