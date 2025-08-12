export abstract class BaseDomainEvent {
  public readonly occurredOn: Date;
  public readonly eventId: string;
  public readonly eventVersion: number;

  constructor(
    public readonly aggregateId: string | number,
    eventVersion: number = 1,
  ) {
    this.occurredOn = new Date();
    this.eventId = this.generateEventId();
    this.eventVersion = eventVersion;
  }

  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  abstract getEventName(): string;
  abstract getEventData(): Record<string, any>;

  toJSON(): Record<string, any> {
    return {
      eventId: this.eventId,
      eventName: this.getEventName(),
      eventVersion: this.eventVersion,
      aggregateId: this.aggregateId,
      occurredOn: this.occurredOn.toISOString(),
      eventData: this.getEventData(),
    };
  }
}