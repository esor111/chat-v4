import {
  Entity,
  Column,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { BaseEntity } from "./base.entity";
import { Participant } from "./participant.entity";
import { Message } from "./message.entity";
import { ConversationType } from "@domain/value-objects/conversation-type.vo";

@Entity("conversations")
export class Conversation extends BaseEntity {
  @Column({
    type: "varchar",
    length: 10,
    transformer: {
      to: (value: ConversationType) => value.value,
      from: (value: string) => ConversationType.fromString(value),
    },
  })
  type: ConversationType;

  @UpdateDateColumn({ name: "last_activity" })
  lastActivity: Date;

  @Column({ name: "last_message_id", nullable: true, type: "uuid" })
  lastMessageId?: string;

  @OneToMany(() => Participant, (participant) => participant.conversation, {
    cascade: true,
  })
  participants: Participant[];

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];

  @ManyToOne(() => Message, { nullable: true })
  @JoinColumn({ name: "last_message_id" })
  lastMessage?: Message;
}
