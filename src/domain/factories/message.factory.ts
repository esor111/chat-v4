import { Message } from '@domain/entities/message.entity';
import { MessageContent } from '@domain/value-objects/message-content.vo';
import { MessageType } from '@domain/value-objects/message-type.vo';
import { MessageSentEvent } from '@domain/events/message-events';

export interface CreateMessageParams {
  conversationId: string;
  senderId: string;
  content: string;
  type?: string;
}

export interface CreateSystemMessageParams {
  conversationId: string;
  content: string;
  systemUserId?: string;
}

export class MessageFactory {
  private static readonly SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

  static create(params: CreateMessageParams): {
    message: Message;
    events: MessageSentEvent[];
  } {
    // Validate input parameters
    MessageFactory.validateCreateParams(params);

    // Create message
    const message = new Message();
    message.conversationId = params.conversationId;
    message.senderId = params.senderId;
    message.content = MessageContent.create(params.content);
    message.type = MessageType.fromString(params.type || 'text');

    // Create domain event
    const event = new MessageSentEvent(
      '', // Will be set after persistence
      params.conversationId,
      params.senderId,
      params.content,
      MessageType.fromString(params.type || 'text'),
    );

    return {
      message,
      events: [event],
    };
  }

  static createTextMessage(
    conversationId: string,
    senderId: string,
    content: string,
  ): {
    message: Message;
    events: MessageSentEvent[];
  } {
    return MessageFactory.create({
      conversationId,
      senderId,
      content,
      type: 'text',
    });
  }

  static createImageMessage(
    conversationId: string,
    senderId: string,
    imageUrl: string,
    caption?: string,
  ): {
    message: Message;
    events: MessageSentEvent[];
  } {
    const content = caption ? `${imageUrl}\n${caption}` : imageUrl;
    
    return MessageFactory.create({
      conversationId,
      senderId,
      content,
      type: 'image',
    });
  }

  static createFileMessage(
    conversationId: string,
    senderId: string,
    fileUrl: string,
    fileName: string,
    fileSize?: number,
  ): {
    message: Message;
    events: MessageSentEvent[];
  } {
    const metadata = {
      url: fileUrl,
      name: fileName,
      size: fileSize,
    };
    
    const content = JSON.stringify(metadata);
    
    return MessageFactory.create({
      conversationId,
      senderId,
      content,
      type: 'file',
    });
  }

  static createSystemMessage(params: CreateSystemMessageParams): {
    message: Message;
    events: MessageSentEvent[];
  } {
    const systemUserId = params.systemUserId || MessageFactory.SYSTEM_USER_ID;
    
    return MessageFactory.create({
      conversationId: params.conversationId,
      senderId: systemUserId,
      content: params.content,
      type: 'system',
    });
  }

  static createParticipantJoinedMessage(
    conversationId: string,
    joinedUserId: string,
    joinedUserName: string,
  ): {
    message: Message;
    events: MessageSentEvent[];
  } {
    return MessageFactory.createSystemMessage({
      conversationId,
      content: `${joinedUserName} joined the conversation`,
    });
  }

  static createParticipantLeftMessage(
    conversationId: string,
    leftUserId: string,
    leftUserName: string,
  ): {
    message: Message;
    events: MessageSentEvent[];
  } {
    return MessageFactory.createSystemMessage({
      conversationId,
      content: `${leftUserName} left the conversation`,
    });
  }

  static createConversationCreatedMessage(
    conversationId: string,
    creatorName: string,
    conversationTitle?: string,
  ): {
    message: Message;
    events: MessageSentEvent[];
  } {
    const content = conversationTitle
      ? `${creatorName} created "${conversationTitle}"`
      : `${creatorName} created the conversation`;

    return MessageFactory.createSystemMessage({
      conversationId,
      content,
    });
  }

  static createBusinessHoursMessage(
    conversationId: string,
    businessName: string,
    isOpen: boolean,
  ): {
    message: Message;
    events: MessageSentEvent[];
  } {
    const content = isOpen
      ? `${businessName} is currently open and available to chat`
      : `${businessName} is currently closed. We'll respond when we're back online`;

    return MessageFactory.createSystemMessage({
      conversationId,
      content,
    });
  }

  private static validateCreateParams(params: CreateMessageParams): void {
    if (!params.conversationId || typeof params.conversationId !== 'string') {
      throw new Error('Conversation ID must be a valid UUID string');
    }

    if (!params.senderId || typeof params.senderId !== 'string') {
      throw new Error('Sender ID must be a valid UUID string');
    }

    if (!params.content || typeof params.content !== 'string') {
      throw new Error('Message content is required and must be a string');
    }

    // Validate content using MessageContent value object
    try {
      MessageContent.create(params.content);
    } catch (error) {
      throw new Error(`Invalid message content: ${error.message}`);
    }

    // Validate message type if provided
    if (params.type) {
      try {
        MessageType.fromString(params.type);
      } catch (error) {
        throw new Error(`Invalid message type: ${error.message}`);
      }
    }
  }
}