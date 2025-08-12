export class MessageType {
  private static readonly VALID_TYPES = ['text', 'image', 'file', 'system'] as const;
  
  public static readonly TEXT = new MessageType('text');
  public static readonly IMAGE = new MessageType('image');
  public static readonly FILE = new MessageType('file');
  public static readonly SYSTEM = new MessageType('system');

  private constructor(public readonly value: string) {
    if (!MessageType.VALID_TYPES.includes(value as any)) {
      throw new Error(`Invalid message type: ${value}. Valid types are: ${MessageType.VALID_TYPES.join(', ')}`);
    }
  }

  static fromString(value: string): MessageType {
    switch (value) {
      case 'text':
        return MessageType.TEXT;
      case 'image':
        return MessageType.IMAGE;
      case 'file':
        return MessageType.FILE;
      case 'system':
        return MessageType.SYSTEM;
      default:
        throw new Error(`Invalid message type: ${value}`);
    }
  }

  equals(other: MessageType): boolean {
    return this.value === other.value;
  }

  isText(): boolean {
    return this.value === 'text';
  }

  isImage(): boolean {
    return this.value === 'image';
  }

  isFile(): boolean {
    return this.value === 'file';
  }

  isSystem(): boolean {
    return this.value === 'system';
  }

  toString(): string {
    return this.value;
  }
}