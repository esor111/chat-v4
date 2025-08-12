import { Participant } from '@domain/entities/participant.entity';
import { ParticipantRole } from '@domain/value-objects/participant-role.vo';

export interface IParticipantRepository {
  findByConversationAndUser(conversationId: number, userId: number): Promise<Participant | null>;
  findByConversation(conversationId: number): Promise<Participant[]>;
  findByUser(userId: number): Promise<Participant[]>;
  save(participant: Participant): Promise<Participant>;
  delete(conversationId: number, userId: number): Promise<void>;
  updateLastReadMessage(conversationId: number, userId: number, messageId: number): Promise<void>;
}

export interface IParticipantQueryRepository {
  findByConversationAndUser(conversationId: number, userId: number): Promise<Participant | null>;
  findByConversation(conversationId: number): Promise<Participant[]>;
  findByUser(userId: number): Promise<Participant[]>;
  findByRole(role: ParticipantRole): Promise<Participant[]>;
  findUnreadCounts(userId: number): Promise<Array<{ conversationId: number; unreadCount: number }>>;
  isParticipant(conversationId: number, userId: number): Promise<boolean>;
  countByConversation(conversationId: number): Promise<number>;
}

export interface IParticipantCommandRepository {
  save(participant: Participant): Promise<Participant>;
  delete(conversationId: number, userId: number): Promise<void>;
  bulkSave(participants: Participant[]): Promise<Participant[]>;
  updateLastReadMessage(conversationId: number, userId: number, messageId: number): Promise<void>;
  updateRole(conversationId: number, userId: number, role: ParticipantRole): Promise<void>;
  toggleMute(conversationId: number, userId: number, isMuted: boolean): Promise<void>;
}