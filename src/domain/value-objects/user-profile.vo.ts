export interface UserProfileData {
  userId: number;
  name: string;
  email?: string;
  avatar?: string;
  status?: string;
  lastSeen?: Date;
}

export class UserProfile {
  private constructor(
    public readonly userId: number,
    public readonly name: string,
    public readonly email?: string,
    public readonly avatar?: string,
    public readonly status?: string,
    public readonly lastSeen?: Date,
  ) {}

  static create(data: UserProfileData): UserProfile {
    if (!data.userId || data.userId <= 0) {
      throw new Error('User ID must be a positive number');
    }

    if (!data.name || data.name.trim().length === 0) {
      throw new Error('User name is required');
    }

    if (data.name.trim().length > 100) {
      throw new Error('User name cannot exceed 100 characters');
    }

    if (data.email && !UserProfile.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    return new UserProfile(
      data.userId,
      data.name.trim(),
      data.email?.trim(),
      data.avatar?.trim(),
      data.status?.trim(),
      data.lastSeen,
    );
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  equals(other: UserProfile): boolean {
    return (
      this.userId === other.userId &&
      this.name === other.name &&
      this.email === other.email &&
      this.avatar === other.avatar &&
      this.status === other.status
    );
  }

  getDisplayName(): string {
    return this.name;
  }

  isOnline(): boolean {
    return this.status === 'online';
  }

  hasAvatar(): boolean {
    return !!this.avatar && this.avatar.length > 0;
  }

  toJSON(): UserProfileData {
    return {
      userId: this.userId,
      name: this.name,
      email: this.email,
      avatar: this.avatar,
      status: this.status,
      lastSeen: this.lastSeen,
    };
  }
}