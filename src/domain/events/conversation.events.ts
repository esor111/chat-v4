export abstract class DomainEvent {
  public readonly occurredOn: Date;
  public readonly eventId: string;

  constructor() {
    this.occurredOn = new Date();
    this.eventId = crypto.randomUUID();
  }
}

export class ConversationCreatedEvent extends DomainEvent {
  constructor(
    public readonly conversationId: string,
    public readonly type: 'direct' | 'group',
    public readonly createdBy: string,
    public readonly participants: string[]
  ) {
    super();
  }
}

export class MessageSentEvent extends DomainEvent {
  constructor(
    public readonly messageId: string,
    public readonly conversationId: string,
    public readonly senderId: string,
    public readonly content: string,
    public readonly messageType: string
  ) {
    super();
  }
}

export class ParticipantJoinedEvent extends DomainEvent {
  constructor(
    public readonly conversationId: string,
    public readonly userId: string,
    public readonly addedBy: string
  ) {
    super();
  }
}