import { Conversation } from '@domain/entities/conversation.entity';
import { ConversationType } from '@domain/value-objects/conversation-type.vo';

export interface IConversationRepository {
  findById(conversationId: number): Promise<Conversation | null>;
  findByIds(conversationIds: number[], options?: { limit?: number; offset?: number }): Promise<Conversation[]>;
  findByParticipant(userId: number): Promise<Conversation[]>;
  save(conversation: Conversation): Promise<Conversation>;
  delete(conversationId: number): Promise<void>;
  updateLastActivity(conversationId: number, lastMessageId?: number): Promise<void>;
}

export interface IConversationQueryRepository {
  findById(conversationId: number): Promise<Conversation | null>;
  findByIdWithParticipants(conversationId: number): Promise<Conversation | null>;
  findByParticipant(userId: number, limit?: number, offset?: number): Promise<Conversation[]>;
  findByType(type: ConversationType, limit?: number): Promise<Conversation[]>;
  findDirectConversation(user1Id: number, user2Id: number): Promise<Conversation | null>;
  countByParticipant(userId: number): Promise<number>;
  findRecentConversations(userId: number, limit: number): Promise<Conversation[]>;
}

export interface IConversationCommandRepository {
  save(conversation: Conversation): Promise<Conversation>;
  delete(conversationId: number): Promise<void>;
  updateLastActivity(conversationId: number, lastMessageId?: number): Promise<void>;
  bulkUpdateLastActivity(updates: Array<{ conversationId: number; lastMessageId?: number }>): Promise<void>;
}