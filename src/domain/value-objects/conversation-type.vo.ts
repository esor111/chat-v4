export class ConversationType {
  private static readonly VALID_TYPES = ['direct', 'group', 'business'] as const;
  
  public static readonly DIRECT = new ConversationType('direct');
  public static readonly GROUP = new ConversationType('group');
  public static readonly BUSINESS = new ConversationType('business');

  private constructor(public readonly value: string) {
    if (!ConversationType.VALID_TYPES.includes(value as any)) {
      throw new Error(`Invalid conversation type: ${value}. Valid types are: ${ConversationType.VALID_TYPES.join(', ')}`);
    }
  }

  static fromString(value: string): ConversationType {
    switch (value) {
      case 'direct':
        return ConversationType.DIRECT;
      case 'group':
        return ConversationType.GROUP;
      case 'business':
        return ConversationType.BUSINESS;
      default:
        throw new Error(`Invalid conversation type: ${value}`);
    }
  }

  equals(other: ConversationType): boolean {
    return this.value === other.value;
  }

  isDirect(): boolean {
    return this.value === 'direct';
  }

  isGroup(): boolean {
    return this.value === 'group';
  }

  isBusiness(): boolean {
    return this.value === 'business';
  }

  toString(): string {
    return this.value;
  }
}