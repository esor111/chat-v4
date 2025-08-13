import { Message } from '@domain/entities/message.entity';
import { MessageType } from '@domain/value-objects/message-type.vo';

export interface IMessageRepository {
  findById(messageId: string): Promise<Message | null>;
  findByConversation(conversationId: string, limit?: number, beforeMessageId?: string): Promise<Message[]>;
  findUnreadMessages(conversationId: string, lastReadMessageId: string): Promise<Message[]>;
  save(message: Message): Promise<Message>;
  delete(messageId: string): Promise<void>;
  softDelete(messageId: string): Promise<void>;
}

export interface IMessageQueryRepository {
  findById(messageId: string): Promise<Message | null>;
  findByConversation(conversationId: string, limit?: number, beforeMessageId?: string): Promise<Message[]>;
  findByConversationWithSender(conversationId: string, limit?: number, beforeMessageId?: string): Promise<Message[]>;
  findByType(type: MessageType, limit?: number): Promise<Message[]>;
  countByConversation(conversationId: string): Promise<number>;
  findUnreadMessages(conversationId: string, lastReadMessageId: string): Promise<Message[]>;
  findMessagesForRetention(olderThanDays: number, limit?: number): Promise<Message[]>;
  findDeletedMessages(olderThanDays: number, limit?: number): Promise<Message[]>;
}

export interface IMessageCommandRepository {
  save(message: Message): Promise<Message>;
  delete(messageId: string): Promise<void>;
  softDelete(messageId: string): Promise<void>;
  bulkSoftDelete(messageIds: string[]): Promise<void>;
  bulkHardDelete(messageIds: string[]): Promise<void>;
  updateContent(messageId: string, newContent: string): Promise<void>;
}