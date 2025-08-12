import { BaseDomainEvent } from './base-domain-event';
import { MessageType } from '@domain/value-objects/message-type.vo';

export class MessageSentEvent extends BaseDomainEvent {
  constructor(
    messageId: number,
    public readonly conversationId: number,
    public readonly senderId: number,
    public readonly content: string,
    public readonly type: MessageType,
  ) {
    super(messageId);
  }

  getEventName(): string {
    return 'MessageSent';
  }

  getEventData(): Record<string, any> {
    return {
      messageId: this.aggregateId,
      conversationId: this.conversationId,
      senderId: this.senderId,
      content: this.content,
      type: this.type.value,
    };
  }
}

export class MessageEditedEvent extends BaseDomainEvent {
  constructor(
    messageId: number,
    public readonly conversationId: number,
    public readonly editedBy: number,
    public readonly oldContent: string,
    public readonly newContent: string,
  ) {
    super(messageId);
  }

  getEventName(): string {
    return 'MessageEdited';
  }

  getEventData(): Record<string, any> {
    return {
      messageId: this.aggregateId,
      conversationId: this.conversationId,
      editedBy: this.editedBy,
      oldContent: this.oldContent,
      newContent: this.newContent,
    };
  }
}

export class MessageDeletedEvent extends BaseDomainEvent {
  constructor(
    messageId: number,
    public readonly conversationId: number,
    public readonly deletedBy: number,
    public readonly deletionType: 'soft' | 'hard',
  ) {
    super(messageId);
  }

  getEventName(): string {
    return 'MessageDeleted';
  }

  getEventData(): Record<string, any> {
    return {
      messageId: this.aggregateId,
      conversationId: this.conversationId,
      deletedBy: this.deletedBy,
      deletionType: this.deletionType,
    };
  }
}

export class MessageReadEvent extends BaseDomainEvent {
  constructor(
    messageId: number,
    public readonly conversationId: number,
    public readonly readBy: number,
    public readonly readAt: Date,
  ) {
    super(messageId);
  }

  getEventName(): string {
    return 'MessageRead';
  }

  getEventData(): Record<string, any> {
    return {
      messageId: this.aggregateId,
      conversationId: this.conversationId,
      readBy: this.readBy,
      readAt: this.readAt.toISOString(),
    };
  }
}