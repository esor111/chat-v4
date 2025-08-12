export class MessageContent {
  private static readonly MAX_LENGTH = 10000;
  private static readonly MIN_LENGTH = 1;

  private constructor(public readonly content: string) {
    this.validate(content);
  }

  static create(content: string): MessageContent {
    return new MessageContent(content);
  }

  private validate(content: string): void {
    if (!content || typeof content !== 'string') {
      throw new Error('Message content must be a non-empty string');
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length < MessageContent.MIN_LENGTH) {
      throw new Error(`Message content must be at least ${MessageContent.MIN_LENGTH} character long`);
    }

    if (trimmedContent.length > MessageContent.MAX_LENGTH) {
      throw new Error(`Message content cannot exceed ${MessageContent.MAX_LENGTH} characters`);
    }
  }

  equals(other: MessageContent): boolean {
    return this.content === other.content;
  }

  length(): number {
    return this.content.length;
  }

  isEmpty(): boolean {
    return this.content.trim().length === 0;
  }

  contains(substring: string): boolean {
    return this.content.toLowerCase().includes(substring.toLowerCase());
  }

  toString(): string {
    return this.content;
  }
}