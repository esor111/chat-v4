import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Conversation } from './conversation.entity';
import { User } from './user.entity';
import { ParticipantRole } from '@domain/value-objects/participant-role.vo';

@Entity('participants')
export class Participant {
  @PrimaryColumn({ name: 'conversation_id', type: 'uuid' })
  conversationId: string;

  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({
    type: 'varchar',
    length: 20,
    transformer: {
      to: (value: ParticipantRole) => value.value,
      from: (value: string) => ParticipantRole.fromString(value),
    },
  })
  role: ParticipantRole;

  @Column({ name: 'last_read_message_id', nullable: true, type: 'uuid' })
  lastReadMessageId?: string;

  @Column({ name: 'is_muted', default: false })
  isMuted: boolean;

  @ManyToOne(() => Conversation, conversation => conversation.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}