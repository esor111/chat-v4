import { Message } from '@domain/entities/message.entity';
import { MessageType } from '@domain/value-objects/message-type.vo';

export interface IMessageRepository {
  findById(messageId: number): Promise<Message | null>;
  findByConversation(conversationId: number, limit?: number, beforeMessageId?: number): Promise<Message[]>;
  findUnreadMessages(conversationId: number, lastReadMessageId: number): Promise<Message[]>;
  save(message: Message): Promise<Message>;
  delete(messageId: number): Promise<void>;
  softDelete(messageId: number): Promise<void>;
}

export interface IMessageQueryRepository {
  findById(messageId: number): Promise<Message | null>;
  findByConversation(conversationId: number, limit?: number, beforeMessageId?: number): Promise<Message[]>;
  findByConversationWithSender(conversationId: number, limit?: number, beforeMessageId?: number): Promise<Message[]>;
  findByType(type: MessageType, limit?: number): Promise<Message[]>;
  countByConversation(conversationId: number): Promise<number>;
  findUnreadMessages(conversationId: number, lastReadMessageId: number): Promise<Message[]>;
  findMessagesForRetention(olderThanDays: number, limit?: number): Promise<Message[]>;
  findDeletedMessages(olderThanDays: number, limit?: number): Promise<Message[]>;
}

export interface IMessageCommandRepository {
  save(message: Message): Promise<Message>;
  delete(messageId: number): Promise<void>;
  softDelete(messageId: number): Promise<void>;
  bulkSoftDelete(messageIds: number[]): Promise<void>;
  bulkHardDelete(messageIds: number[]): Promise<void>;
  updateContent(messageId: number, newContent: string): Promise<void>;
}