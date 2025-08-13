import { Injectable, Logger, Inject } from '@nestjs/common';
import { IMessageRepository } from '@domain/repositories/message.repository.interface';
import { IConversationRepository } from '@domain/repositories/conversation.repository.interface';
import { IParticipantRepository } from '@domain/repositories/participant.repository.interface';
import { Message } from '@domain/entities/message.entity';
import { MessageContent } from '@domain/value-objects/message-content.vo';
import { MessageType } from '@domain/value-objects/message-type.vo';
import { ChatGateway } from '@infrastructure/websocket/chat.gateway';

export interface SendMessageRequest {
  senderId: string;
  conversationId: string;
  content: string;
  messageType?: string;
}

export interface SendMessageResponse {
  success: boolean;
  message?: {
    messageId: string;
    conversationId: string;
    senderId: string;
    content: string;
    messageType: string;
    sentAt: Date;
  };
  error?: string;
}

@Injectable()
export class WebSocketMessageService {
  private readonly logger = new Logger(WebSocketMessageService.name);

  constructor(
    @Inject('IMessageRepository')
    private readonly messageRepository: IMessageRepository,
    @Inject('IConversationRepository')
    private readonly conversationRepository: IConversationRepository,
    @Inject('IParticipantRepository')
    private readonly participantRepository: IParticipantRepository,
    private readonly chatGateway: ChatGateway,
  ) {}

  /**
   * Process and send a message through WebSocket
   */
  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    try {
      const { senderId, conversationId, content, messageType = 'text' } = request;

      // Validate message content
      const validationResult = this.validateMessageContent(content);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: validationResult.error,
        };
      }

      // Check if conversation exists and user is a participant
      const canSend = await this.canUserSendMessage(senderId, conversationId);
      if (!canSend.allowed) {
        return {
          success: false,
          error: canSend.reason,
        };
      }

      // Create message content value object
      const messageContent = MessageContent.create(content.trim());
      const messageTypeVO = MessageType.fromString(messageType);

      // Create message entity
      const message = new Message();
      message.conversationId = conversationId;
      message.senderId = senderId;
      message.content = messageContent;
      message.type = messageTypeVO;

      const savedMessage = await this.messageRepository.save(message);

      // Update conversation's last message and activity
      await this.updateConversationActivity(conversationId, savedMessage.id);

      // Broadcast message to conversation participants
      await this.broadcastMessage(savedMessage);

      this.logger.log(`Message ${savedMessage.id} sent by user ${senderId} to conversation ${conversationId}`);

      return {
        success: true,
        message: {
          messageId: savedMessage.id,
          conversationId: savedMessage.conversationId,
          senderId: savedMessage.senderId,
          content: savedMessage.content.content,
          messageType: savedMessage.type.value,
          sentAt: savedMessage.sentAt,
        },
      };

    } catch (error) {
      this.logger.error(`Error sending message:`, error);
      return {
        success: false,
        error: 'Failed to send message',
      };
    }
  }

  /**
   * Get recent messages for a conversation
   */
  async getRecentMessages(conversationId: string, limit: number = 50): Promise<{
    messages: Array<{
      messageId: string;
      senderId: string;
      content: string;
      messageType: string;
      sentAt: Date;
    }>;
  }> {
    try {
      const messages = await this.messageRepository.findByConversation(
        conversationId,
        limit
      );

      return {
        messages: messages.map(message => ({
          messageId: message.id,
          senderId: message.senderId,
          content: message.content.content,
          messageType: message.type.value,
          sentAt: message.sentAt,
        })),
      };
    } catch (error) {
      this.logger.error(`Error getting recent messages for conversation ${conversationId}:`, error);
      return { messages: [] };
    }
  }

  /**
   * Validate message content
   */
  private validateMessageContent(content: string): { isValid: boolean; error?: string } {
    if (!content || typeof content !== 'string') {
      return { isValid: false, error: 'Message content is required' };
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length === 0) {
      return { isValid: false, error: 'Message content cannot be empty' };
    }

    if (trimmedContent.length > 4000) {
      return { isValid: false, error: 'Message content is too long (max 4000 characters)' };
    }

    return { isValid: true };
  }

  /**
   * Check if user can send message to conversation
   */
  private async canUserSendMessage(userId: string, conversationId: string): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    try {
      // Check if conversation exists
      const conversation = await this.conversationRepository.findById(conversationId);
      if (!conversation) {
        return { allowed: false, reason: 'Conversation not found' };
      }

      // Check if user is a participant
      const participant = await this.participantRepository.findByConversationAndUser(
        conversationId,
        userId
      );
      if (!participant) {
        return { allowed: false, reason: 'User is not a participant in this conversation' };
      }

      return { allowed: true };
    } catch (error) {
      this.logger.error(`Error checking user permissions:`, error);
      return { allowed: false, reason: 'Permission check failed' };
    }
  }

  /**
   * Update conversation's last message and activity timestamp
   */
  private async updateConversationActivity(conversationId: string, messageId: string): Promise<void> {
    try {
      const conversation = await this.conversationRepository.findById(conversationId);
      if (conversation) {
        conversation.lastMessageId = messageId;
        conversation.lastActivity = new Date();
        await this.conversationRepository.save(conversation);
      }
    } catch (error) {
      this.logger.error(`Error updating conversation activity:`, error);
      // Don't throw - this is not critical for message sending
    }
  }

  /**
   * Broadcast message to all conversation participants via WebSocket
   */
  private async broadcastMessage(message: Message): Promise<void> {
    try {
      const messageData = {
        message_id: message.id,
        conversation_id: message.conversationId,
        sender_id: message.senderId,
        content: message.content.content,
        message_type: message.type.value,
        sent_at: message.sentAt.toISOString(),
      };

      // Send to conversation room
      await this.chatGateway.sendMessageToConversation(
        message.conversationId,
        'new_message',
        messageData
      );

      this.logger.debug(`Broadcasted message ${message.id} to conversation ${message.conversationId}`);
    } catch (error) {
      this.logger.error(`Error broadcasting message:`, error);
      // Don't throw - message is already saved
    }
  }

  /**
   * Handle offline message delivery
   */
  async deliverOfflineMessages(userId: string): Promise<void> {
    try {
      // Get user's conversations
      const participants = await this.participantRepository.findByUser(userId);
      
      for (const participant of participants) {
        // Get unread messages since last read
        const lastReadMessageId = participant.lastReadMessageId || '0';
        const messages = await this.messageRepository.findUnreadMessages(
          participant.conversationId,
          lastReadMessageId
        );

        // Send each message to the user
        for (const message of messages) {
          const messageData = {
            message_id: message.id,
            conversation_id: message.conversationId,
            sender_id: message.senderId,
            content: message.content.content,
            message_type: message.type.value,
            sent_at: message.sentAt.toISOString(),
          };

          const delivered = await this.chatGateway.sendMessageToUser(
            userId,
            'offline_message',
            messageData
          );

          if (delivered) {
            this.logger.debug(`Delivered offline message ${message.id} to user ${userId}`);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error delivering offline messages to user ${userId}:`, error);
    }
  }

  /**
   * Mark messages as read for a user in a conversation
   */
  async markMessagesAsRead(userId: string, conversationId: string, lastMessageId: string): Promise<void> {
    try {
      const participant = await this.participantRepository.findByConversationAndUser(
        conversationId,
        userId
      );

      if (participant) {
        participant.lastReadMessageId = lastMessageId;
        await this.participantRepository.save(participant);
        
        this.logger.debug(`Marked messages as read for user ${userId} in conversation ${conversationId} up to message ${lastMessageId}`);
      }
    } catch (error) {
      this.logger.error(`Error marking messages as read:`, error);
    }
  }
}