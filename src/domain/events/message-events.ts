import { BaseDomainEvent } from './base-domain-event';
import { MessageType } from '@domain/value-objects/message-type.vo';

export class MessageSentEvent extends BaseDomainEvent {
  constructor(
    messageId: string,
    public readonly conversationId: string,
    public readonly senderId: string,
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
    messageId: string,
    public readonly conversationId: string,
    public readonly editedBy: string,
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
    messageId: string,
    public readonly conversationId: string,
    public readonly deletedBy: string,
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
    messageId: string,
    public readonly conversationId: string,
    public readonly readBy: string,
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