import { Conversation } from '@domain/entities/conversation.entity';
import { ConversationType } from '@domain/value-objects/conversation-type.vo';

export interface IConversationRepository {
  findById(conversationId: string): Promise<Conversation | null>;
  findByIds(conversationIds: string[], options?: { limit?: number; offset?: number }): Promise<Conversation[]>;
  findByParticipant(userId: string): Promise<Conversation[]>;
  save(conversation: Conversation): Promise<Conversation>;
  delete(conversationId: string): Promise<void>;
  updateLastActivity(conversationId: string, lastMessageId?: string): Promise<void>;
}

export interface IConversationQueryRepository {
  findById(conversationId: string): Promise<Conversation | null>;
  findByIdWithParticipants(conversationId: string): Promise<Conversation | null>;
  findByParticipant(userId: string, limit?: number, offset?: number): Promise<Conversation[]>;
  findByType(type: ConversationType, limit?: number): Promise<Conversation[]>;
  findDirectConversation(user1Id: string, user2Id: string): Promise<Conversation | null>;
  countByParticipant(userId: string): Promise<number>;
  findRecentConversations(userId: string, limit: number): Promise<Conversation[]>;
}

export interface IConversationCommandRepository {
  save(conversation: Conversation): Promise<Conversation>;
  delete(conversationId: string): Promise<void>;
  updateLastActivity(conversationId: string, lastMessageId?: string): Promise<void>;
  bulkUpdateLastActivity(updates: Array<{ conversationId: string; lastMessageId?: string }>): Promise<void>;
}