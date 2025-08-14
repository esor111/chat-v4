import { Entity, Column, CreateDateColumn, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { Conversation } from './conversation.entity';
import { User } from './user.entity';
import { MessageContent } from '@domain/value-objects/message-content.vo';
import { MessageType } from '@domain/value-objects/message-type.vo';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn({ name: 'message_id' })
  id: string;
  @Column({ name: 'conversation_id', type: 'integer' })
  conversationId: string;

  @Column({ name: 'sender_id', type: 'varchar', length: 255 })
  senderId: string;

  @Column({
    type: 'text',
    transformer: {
      to: (value: MessageContent) => value.content,
      from: (value: string) => MessageContent.create(value),
    },
  })
  content: MessageContent;

  @CreateDateColumn({ name: 'sent_at' })
  sentAt: Date;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'text',
    transformer: {
      to: (value: MessageType) => value.value,
      from: (value: string) => MessageType.fromString(value),
    },
  })
  type: MessageType;

  @Column({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  @ManyToOne(() => Conversation, conversation => conversation.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender: User;

}