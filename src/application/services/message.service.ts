import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '@domain/entities/message.entity';
import { Conversation } from '@domain/entities/conversation.entity';
import { Participant } from '@domain/entities/participant.entity';
import { MessageFactory } from '@domain/factories/message.factory';
import { MessageContent } from '@domain/value-objects/message-content.vo';
import { MessageType } from '@domain/value-objects/message-type.vo';
import { StructuredLoggerService } from '@infrastructure/logging/structured-logger.service';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Participant)
    private readonly participantRepository: Repository<Participant>,
    private readonly logger: StructuredLoggerService,
  ) {}

  async sendMessage(params: {
    conversationId: string;
    senderId: string;
    content: string;
    type?: string;
  }): Promise<Message> {
    this.logger.log('Sending message', {
      service: 'MessageService',
      operation: 'sendMessage',
      conversationId: params.conversationId,
      senderId: params.senderId,
      type: params.type || 'text',
    });

    // Validate conversation exists and user is participant
    await this.validateUserCanSendMessage(params.conversationId, params.senderId);

    // Use factory to create message with validation
    const { message } = MessageFactory.create(params);

    // Save message
    const savedMessage = await this.messageRepository.save(message);

    // Update conversation last activity and last message
    await this.updateConversationLastMessage(params.conversationId, savedMessage.id);

    this.logger.audit('Message sent', {
      messageId: savedMessage.id,
      conversationId: params.conversationId,
      senderId: params.senderId,
    });

    return savedMessage;
  }

  async editMessage(
    messageId: string,
    newContent: string,
    editedBy: string,
  ): Promise<Message> {
    this.logger.log('Editing message', {
      service: 'MessageService',
      operation: 'editMessage',
      messageId,
      editedBy,
    });

    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Business rule validations
    this.validateCanEditMessage(message, editedBy);

    // Update message content
    message.content = MessageContent.create(newContent);
    const savedMessage = await this.messageRepository.save(message);

    this.logger.audit('Message edited', {
      messageId,
      editedBy,
      conversationId: message.conversationId,
    });

    return savedMessage;
  }

  async deleteMessage(messageId: string, deletedBy: string): Promise<void> {
    this.logger.log('Deleting message', {
      service: 'MessageService',
      operation: 'deleteMessage',
      messageId,
      deletedBy,
    });

    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Business rule validations
    this.validateCanDeleteMessage(message, deletedBy);

    // Soft delete message
    message.deletedAt = new Date();
    await this.messageRepository.save(message);

    this.logger.audit('Message deleted', {
      messageId,
      deletedBy,
      conversationId: message.conversationId,
    });
  }

  async getMessages(
    conversationId: string,
    userId: string,
    beforeMessageId?: string,
    limit: number = 50,
  ): Promise<{ messages: Message[]; hasMore: boolean }> {
    // Validate user is participant
    await this.validateUserIsParticipant(conversationId, userId);

    let query = this.messageRepository
      .createQueryBuilder('message')
      .where('message.conversationId = :conversationId', { conversationId })
      .andWhere('message.deletedAt IS NULL')
      .orderBy('message.sentAt', 'DESC')
      .limit(limit + 1); // Get one extra to check if there are more

    if (beforeMessageId) {
      query = query.andWhere('message.id < :beforeMessageId', { beforeMessageId });
    }

    const messages = await query.getMany();
    const hasMore = messages.length > limit;

    if (hasMore) {
      messages.pop(); // Remove the extra message
    }

    return {
      messages: messages.reverse(), // Return in chronological order
      hasMore,
    };
  }

  async markMessageAsRead(
    conversationId: string,
    messageId: string,
    userId: string,
  ): Promise<void> {
    this.logger.log('Marking message as read', {
      service: 'MessageService',
      operation: 'markMessageAsRead',
      conversationId,
      messageId,
      userId,
    });

    // Validate user is participant
    const participant = await this.participantRepository.findOne({
      where: { conversationId, userId },
    });

    if (!participant) {
      throw new Error('User is not a participant in this conversation');
    }

    // Update last read message
    participant.lastReadMessageId = messageId;
    await this.participantRepository.save(participant);

    this.logger.audit('Message marked as read', {
      conversationId,
      messageId,
      userId,
    });
  }

  private async validateUserCanSendMessage(conversationId: string, senderId: string): Promise<void> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['participants'],
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const isParticipant = conversation.participants.some(p => p.userId === senderId);
    if (!isParticipant) {
      throw new Error('User is not authorized to send messages in this conversation');
    }
  }

  private async validateUserIsParticipant(conversationId: string, userId: string): Promise<void> {
    const participant = await this.participantRepository.findOne({
      where: { conversationId, userId },
    });

    if (!participant) {
      throw new Error('User is not authorized to access this conversation');
    }
  }

  private validateCanEditMessage(message: Message, editedBy: string): void {
    // Only sender can edit their own messages
    if (editedBy !== message.senderId) {
      throw new Error('Only the message sender can edit the message');
    }

    // Cannot edit deleted messages
    if (message.deletedAt) {
      throw new Error('Cannot edit deleted messages');
    }

    // Cannot edit system messages
    if (message.type.isSystem()) {
      throw new Error('System messages cannot be edited');
    }

    // Messages can only be edited within 24 hours
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    if (message.sentAt < twentyFourHoursAgo) {
      throw new Error('Messages can only be edited within 24 hours of sending');
    }
  }

  private validateCanDeleteMessage(message: Message, deletedBy: string): void {
    // Cannot delete already deleted messages
    if (message.deletedAt) {
      throw new Error('Message is already deleted');
    }

    // Only sender can delete their own messages (or system can delete any)
    if (deletedBy !== message.senderId && deletedBy !== '0') {
      throw new Error('Only the message sender can delete the message');
    }

    // Messages can be deleted within 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    if (message.sentAt < ninetyDaysAgo) {
      throw new Error('Messages can only be deleted within 90 days of sending');
    }
  }

  private async updateConversationLastMessage(conversationId: string, messageId: string): Promise<void> {
    await this.conversationRepository.update(conversationId, {
      lastMessageId: messageId,
      lastActivity: new Date(),
    });
  }
}