import { BaseDomainEvent } from './base-domain-event';
import { ConversationType } from '@domain/value-objects/conversation-type.vo';
import { ParticipantRole } from '@domain/value-objects/participant-role.vo';

export class ConversationCreatedEvent extends BaseDomainEvent {
  constructor(
    conversationId: number,
    public readonly type: ConversationType,
    public readonly createdBy: number,
    public readonly participants: Array<{ userId: number; role: ParticipantRole }>,
  ) {
    super(conversationId);
  }

  getEventName(): string {
    return 'ConversationCreated';
  }

  getEventData(): Record<string, any> {
    return {
      conversationId: this.aggregateId,
      type: this.type.value,
      createdBy: this.createdBy,
      participants: this.participants.map(p => ({
        userId: p.userId,
        role: p.role.value,
      })),
    };
  }
}

export class ParticipantAddedEvent extends BaseDomainEvent {
  constructor(
    conversationId: number,
    public readonly userId: number,
    public readonly role: ParticipantRole,
    public readonly addedBy: number,
  ) {
    super(conversationId);
  }

  getEventName(): string {
    return 'ParticipantAdded';
  }

  getEventData(): Record<string, any> {
    return {
      conversationId: this.aggregateId,
      userId: this.userId,
      role: this.role.value,
      addedBy: this.addedBy,
    };
  }
}

export class ParticipantRemovedEvent extends BaseDomainEvent {
  constructor(
    conversationId: number,
    public readonly userId: number,
    public readonly removedBy: number,
    public readonly reason?: string,
  ) {
    super(conversationId);
  }

  getEventName(): string {
    return 'ParticipantRemoved';
  }

  getEventData(): Record<string, any> {
    return {
      conversationId: this.aggregateId,
      userId: this.userId,
      removedBy: this.removedBy,
      reason: this.reason,
    };
  }
}

export class ConversationArchivedEvent extends BaseDomainEvent {
  constructor(
    conversationId: number,
    public readonly archivedBy: number,
    public readonly reason?: string,
  ) {
    super(conversationId);
  }

  getEventName(): string {
    return 'ConversationArchived';
  }

  getEventData(): Record<string, any> {
    return {
      conversationId: this.aggregateId,
      archivedBy: this.archivedBy,
      reason: this.reason,
    };
  }
}