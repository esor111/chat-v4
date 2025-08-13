import { Conversation } from '@domain/entities/conversation.entity';
import { Participant } from '@domain/entities/participant.entity';
import { ConversationType } from '@domain/value-objects/conversation-type.vo';
import { ParticipantRole } from '@domain/value-objects/participant-role.vo';
import { ConversationMetadata } from '@domain/value-objects/conversation-metadata.vo';
import { ConversationCreatedEvent } from '@domain/events/conversation-events';

export interface CreateConversationParams {
  type: string;
  createdBy: string;
  participants: Array<{ userId: string; role: string }>;
  title?: string;
  description?: string;
  avatar?: string;
}

export class ConversationFactory {
  static create(params: CreateConversationParams): {
    conversation: Conversation;
    participants: Participant[];
    events: ConversationCreatedEvent[];
  } {
    // Validate input parameters
    ConversationFactory.validateCreateParams(params);

    // Create conversation type value object
    const conversationType = ConversationType.fromString(params.type);

    // Create conversation metadata
    const metadata = ConversationMetadata.create({
      title: params.title,
      description: params.description,
      avatar: params.avatar,
    });

    // Create conversation entity
    const conversation = new Conversation();
    conversation.type = conversationType;
    
    // Apply metadata if provided
    if (params.title || params.description || params.avatar) {
      // In a real implementation, you might want to add metadata to the conversation entity
      // For now, we'll assume the conversation can hold metadata
    }

    // Create participants
    const participants: Participant[] = [];
    const participantData: Array<{ userId: string; role: ParticipantRole }> = [];

    for (const participantInfo of params.participants) {
      const role = ParticipantRole.fromString(participantInfo.role);
      
      // For new conversations, we don't have a conversationId yet
      // This would typically be handled after the conversation is persisted
      const participant = new Participant();
      participant.conversationId = ''; // Will be set after conversation is saved
      participant.userId = participantInfo.userId;
      participant.role = role;
      participant.isMuted = false;
      participants.push(participant);
      
      participantData.push({
        userId: participantInfo.userId,
        role,
      });
    }

    // Initialize participants array
    conversation.participants = participants;

    // Create domain event
    const event = new ConversationCreatedEvent(
      '', // Will be set after persistence
      conversationType,
      params.createdBy,
      participantData,
    );

    return {
      conversation,
      participants,
      events: [event],
    };
  }

  static createDirectConversation(
    user1Id: string,
    user2Id: string,
    createdBy: string,
  ): {
    conversation: Conversation;
    participants: Participant[];
    events: ConversationCreatedEvent[];
  } {
    return ConversationFactory.create({
      type: 'direct',
      createdBy,
      participants: [
        { userId: user1Id, role: 'member' },
        { userId: user2Id, role: 'member' },
      ],
    });
  }

  static createGroupConversation(
    participantIds: string[],
    createdBy: string,
    title?: string,
  ): {
    conversation: Conversation;
    participants: Participant[];
    events: ConversationCreatedEvent[];
  } {
    if (participantIds.length > 8) {
      throw new Error('Group conversations cannot have more than 8 participants');
    }

    const participants = participantIds.map(userId => ({
      userId,
      role: userId === createdBy ? 'admin' : 'member',
    }));

    return ConversationFactory.create({
      type: 'group',
      createdBy,
      participants,
      title,
    });
  }

  static createBusinessConversation(
    customerId: string,
    businessId: string,
    agentId?: string,
  ): {
    conversation: Conversation;
    participants: Participant[];
    events: ConversationCreatedEvent[];
  } {
    const participants = [
      { userId: customerId, role: 'customer' },
      { userId: businessId, role: 'business' },
    ];

    if (agentId) {
      participants.push({ userId: agentId, role: 'agent' });
    }

    return ConversationFactory.create({
      type: 'business',
      createdBy: customerId,
      participants,
    });
  }

  private static validateCreateParams(params: CreateConversationParams): void {
    if (!params.createdBy || !params.createdBy.trim()) {
      throw new Error('Created by user ID must be provided');
    }

    if (!params.participants || params.participants.length === 0) {
      throw new Error('At least one participant is required');
    }

    if (params.participants.length > 8) {
      throw new Error('Cannot have more than 8 participants');
    }

    // Validate that createdBy is included in participants
    const creatorIsParticipant = params.participants.some(p => p.userId === params.createdBy);
    if (!creatorIsParticipant) {
      throw new Error('Creator must be included in participants');
    }

    // Validate participant IDs are unique
    const userIds = params.participants.map(p => p.userId);
    const uniqueUserIds = new Set(userIds);
    if (userIds.length !== uniqueUserIds.size) {
      throw new Error('Duplicate participants are not allowed');
    }

    // Validate participant IDs are provided
    params.participants.forEach(p => {
      if (!p.userId || !p.userId.trim()) {
        throw new Error('All participant IDs must be provided');
      }
    });

    // Type-specific validations
    const conversationType = ConversationType.fromString(params.type);
    
    if (conversationType.isDirect() && params.participants.length !== 2) {
      throw new Error('Direct conversations must have exactly 2 participants');
    }

    if (conversationType.isBusiness()) {
      const hasCustomer = params.participants.some(p => p.role === 'customer');
      const hasBusiness = params.participants.some(p => p.role === 'business');
      
      if (!hasCustomer || !hasBusiness) {
        throw new Error('Business conversations must have at least one customer and one business participant');
      }
    }
  }
}