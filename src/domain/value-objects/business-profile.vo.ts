export interface BusinessProfileData {
  businessId: number;
  name: string;
  description?: string;
  logo?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  businessHours?: BusinessHours;
  isActive: boolean;
}

export interface BusinessHours {
  monday?: TimeRange;
  tuesday?: TimeRange;
  wednesday?: TimeRange;
  thursday?: TimeRange;
  friday?: TimeRange;
  saturday?: TimeRange;
  sunday?: TimeRange;
  timezone: string;
}

export interface TimeRange {
  open: string; // HH:mm format
  close: string; // HH:mm format
}

export class BusinessProfile {
  private constructor(
    public readonly businessId: number,
    public readonly name: string,
    public readonly description?: string,
    public readonly logo?: string,
    public readonly website?: string,
    public readonly email?: string,
    public readonly phone?: string,
    public readonly address?: string,
    public readonly businessHours?: BusinessHours,
    public readonly isActive: boolean = true,
  ) {}

  static create(data: BusinessProfileData): BusinessProfile {
    if (!data.businessId || data.businessId <= 0) {
      throw new Error('Business ID must be a positive number');
    }

    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Business name is required');
    }

    if (data.name.trim().length > 200) {
      throw new Error('Business name cannot exceed 200 characters');
    }

    if (data.email && !BusinessProfile.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    if (data.website && !BusinessProfile.isValidUrl(data.website)) {
      throw new Error('Invalid website URL format');
    }

    if (data.businessHours) {
      BusinessProfile.validateBusinessHours(data.businessHours);
    }

    return new BusinessProfile(
      data.businessId,
      data.name.trim(),
      data.description?.trim(),
      data.logo?.trim(),
      data.website?.trim(),
      data.email?.trim(),
      data.phone?.trim(),
      data.address?.trim(),
      data.businessHours,
      data.isActive,
    );
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

  private static validateBusinessHours(hours: BusinessHours): void {
    if (!hours.timezone) {
      throw new Error('Business hours timezone is required');
    }

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    
    Object.entries(hours).forEach(([day, timeRange]) => {
      if (day === 'timezone') return;
      
      if (timeRange) {
        if (!timeRegex.test(timeRange.open)) {
          throw new Error(`Invalid open time format for ${day}: ${timeRange.open}`);
        }
        if (!timeRegex.test(timeRange.close)) {
          throw new Error(`Invalid close time format for ${day}: ${timeRange.close}`);
        }
      }
    });
  }

  equals(other: BusinessProfile): boolean {
    return (
      this.businessId === other.businessId &&
      this.name === other.name &&
      this.email === other.email &&
      this.isActive === other.isActive
    );
  }

  getDisplayName(): string {
    return this.name;
  }

  isOpenNow(): boolean {
    if (!this.businessHours || !this.isActive) {
      return false;
    }

    const now = new Date();
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof BusinessHours;
    const timeRange = this.businessHours[dayName];

    if (!timeRange || typeof timeRange === 'string') {
      return false;
    }

    const currentTime = now.toTimeString().slice(0, 5); // HH:mm format
    return currentTime >= timeRange.open && currentTime <= timeRange.close;
  }

  hasLogo(): boolean {
    return !!this.logo && this.logo.length > 0;
  }

  toJSON(): BusinessProfileData {
    return {
      businessId: this.businessId,
      name: this.name,
      description: this.description,
      logo: this.logo,
      website: this.website,
      email: this.email,
      phone: this.phone,
      address: this.address,
      businessHours: this.businessHours,
      isActive: this.isActive,
    };
  }
}