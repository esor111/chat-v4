export class ParticipantRole {
  private static readonly VALID_ROLES = ['customer', 'agent', 'business', 'member', 'admin'] as const;
  
  public static readonly CUSTOMER = new ParticipantRole('customer');
  public static readonly AGENT = new ParticipantRole('agent');
  public static readonly BUSINESS = new ParticipantRole('business');
  public static readonly MEMBER = new ParticipantRole('member');
  public static readonly ADMIN = new ParticipantRole('admin');

  private constructor(public readonly value: string) {
    if (!ParticipantRole.VALID_ROLES.includes(value as any)) {
      throw new Error(`Invalid participant role: ${value}. Valid roles are: ${ParticipantRole.VALID_ROLES.join(', ')}`);
    }
  }

  static fromString(value: string): ParticipantRole {
    switch (value) {
      case 'customer':
        return ParticipantRole.CUSTOMER;
      case 'agent':
        return ParticipantRole.AGENT;
      case 'business':
        return ParticipantRole.BUSINESS;
      case 'member':
        return ParticipantRole.MEMBER;
      case 'admin':
        return ParticipantRole.ADMIN;
      default:
        throw new Error(`Invalid participant role: ${value}`);
    }
  }

  equals(other: ParticipantRole): boolean {
    return this.value === other.value;
  }

  isCustomer(): boolean {
    return this.value === 'customer';
  }

  isAgent(): boolean {
    return this.value === 'agent';
  }

  isBusiness(): boolean {
    return this.value === 'business';
  }

  isMember(): boolean {
    return this.value === 'member';
  }

  isAdmin(): boolean {
    return this.value === 'admin';
  }

  canManageParticipants(): boolean {
    return this.isAdmin() || this.isBusiness();
  }

  toString(): string {
    return this.value;
  }
}