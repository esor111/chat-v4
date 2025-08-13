import { Participant } from '@domain/entities/participant.entity';
import { ParticipantRole } from '@domain/value-objects/participant-role.vo';

export interface IParticipantRepository {
  findByConversationAndUser(conversationId: string, userId: string): Promise<Participant | null>;
  findByConversation(conversationId: string): Promise<Participant[]>;
  findByUser(userId: string): Promise<Participant[]>;
  save(participant: Participant): Promise<Participant>;
  delete(conversationId: string, userId: string): Promise<void>;
  updateLastReadMessage(conversationId: string, userId: string, messageId: string): Promise<void>;
}

export interface IParticipantQueryRepository {
  findByConversationAndUser(conversationId: string, userId: string): Promise<Participant | null>;
  findByConversation(conversationId: string): Promise<Participant[]>;
  findByUser(userId: string): Promise<Participant[]>;
  findByRole(role: ParticipantRole): Promise<Participant[]>;
  findUnreadCounts(userId: string): Promise<Array<{ conversationId: string; unreadCount: number }>>;
  isParticipant(conversationId: string, userId: string): Promise<boolean>;
  countByConversation(conversationId: string): Promise<number>;
}

export interface IParticipantCommandRepository {
  save(participant: Participant): Promise<Participant>;
  delete(conversationId: string, userId: string): Promise<void>;
  bulkSave(participants: Participant[]): Promise<Participant[]>;
  updateLastReadMessage(conversationId: string, userId: string, messageId: string): Promise<void>;
  updateRole(conversationId: string, userId: string, role: ParticipantRole): Promise<void>;
  toggleMute(conversationId: string, userId: string, isMuted: boolean): Promise<void>;
}