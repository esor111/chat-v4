export interface UserProfileData {
  userId: string; // Changed to string to match infrastructure layer
  name: string;
  email?: string;
  avatar?: string;
  status?: string;
  lastSeen?: Date;
}

export class UserProfile {
  private constructor(
    public readonly userId: string,
    public readonly name: string,
    public readonly email?: string,
    public readonly avatar?: string,
    public readonly status?: string,
    public readonly lastSeen?: Date
  ) {}

  static create(data: UserProfileData): UserProfile {
    UserProfile.validateUserData(data);

    return new UserProfile(
      data.userId.trim(),
      data.name.trim(),
      data.email?.trim(),
      data.avatar?.trim(),
      data.status?.trim(),
      data.lastSeen
    );
  }

  private static validateUserData(data: UserProfileData): void {
    if (!data.userId || data.userId.trim().length === 0) {
      throw new Error("User ID is required and cannot be empty");
    }

    if (!data.name || data.name.trim().length === 0) {
      throw new Error("User name is required");
    }

    if (data.name.trim().length > 100) {
      throw new Error("User name cannot exceed 100 characters");
    }

    if (data.email && !UserProfile.isValidEmail(data.email)) {
      throw new Error("Invalid email format");
    }

    if (data.avatar && !UserProfile.isValidUrl(data.avatar)) {
      throw new Error("Invalid avatar URL format");
    }

    if (data.status && !UserProfile.isValidStatus(data.status)) {
      throw new Error("Invalid status value");
    }
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private static isValidStatus(status: string): boolean {
    const validStatuses = ['online', 'offline', 'away', 'busy'];
    return validStatuses.includes(status.toLowerCase());
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
    return this.status === "online";
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
