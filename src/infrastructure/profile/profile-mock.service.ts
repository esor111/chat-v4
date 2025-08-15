import { Injectable, Logger } from "@nestjs/common";

export interface UserProfile {
  id: string;
  name: string;
  avatar_url?: string;
  user_type: "user";
  is_online?: boolean;
}

export interface BusinessProfile {
  id: string;
  name: string;
  avatar_url?: string;
  user_type: "business";
  is_online: boolean;
  business_hours?: {
    open: string;
    close: string;
    timezone: string;
  };
}

export type Profile = UserProfile | BusinessProfile;

@Injectable()
export class ProfileMockService {
  private readonly logger = new Logger(ProfileMockService.name);
  private readonly profileCache = new Map<string, Profile>();

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData(): void {
    // Mock user profiles - using actual user IDs from your auth microservice
    const mockUsers: UserProfile[] = [
      {
        id: "afc70db3-6f43-4882-92fd-4715f25ffc95",
        name: "Ishwor Gautam",
        avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=ishwor",
        user_type: "user",
        is_online: true,
      },
      {
        id: "c5c3d135-4968-450b-9fca-57f01e0055f7",
        name: "Bhuwan Hamal",
        avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=bhuwan",
        user_type: "user",
        is_online: true,
      },
      {
        id: "550e8400-e29b-41d4-a716-446655440003",
        name: "Jane Smith",
        avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=jane",
        user_type: "user",
        is_online: true,
      },
      {
        id: "550e8400-e29b-41d4-a716-446655440004",
        name: "Mike Johnson",
        avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=mike",
        user_type: "user",
        is_online: false,
      },
      {
        id: "550e8400-e29b-41d4-a716-446655440005",
        name: "Sarah Wilson",
        avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
        user_type: "user",
        is_online: true,
      },
    ];

    // Mock business profiles
    const mockBusinesses: BusinessProfile[] = [
      {
        id: "650e8400-e29b-41d4-a716-446655440100",
        name: "Nike Nepal",
        avatar_url: "https://api.dicebear.com/7.x/initials/svg?seed=Nike",
        user_type: "business",
        is_online: true,
        business_hours: {
          open: "09:00",
          close: "18:00",
          timezone: "Asia/Kathmandu",
        },
      },
      {
        id: "650e8400-e29b-41d4-a716-446655440101",
        name: "Adidas Store",
        avatar_url: "https://api.dicebear.com/7.x/initials/svg?seed=Adidas",
        user_type: "business",
        is_online: false,
        business_hours: {
          open: "10:00",
          close: "20:00",
          timezone: "Asia/Kathmandu",
        },
      },
      {
        id: "650e8400-e29b-41d4-a716-446655440102",
        name: "Tech Support Co.",
        avatar_url: "https://api.dicebear.com/7.x/initials/svg?seed=Tech",
        user_type: "business",
        is_online: true,
        business_hours: {
          open: "08:00",
          close: "17:00",
          timezone: "Asia/Kathmandu",
        },
      },
      {
        id: "650e8400-e29b-41d4-a716-446655440103",
        name: "Food Delivery Plus",
        avatar_url: "https://api.dicebear.com/7.x/initials/svg?seed=Food",
        user_type: "business",
        is_online: true,
        business_hours: {
          open: "06:00",
          close: "23:00",
          timezone: "Asia/Kathmandu",
        },
      },
    ];

    // Cache the mock data
    mockUsers.forEach((user) => {
      this.profileCache.set(`user:${user.id}`, user);
    });

    mockBusinesses.forEach((business) => {
      this.profileCache.set(`business:${business.id}`, business);
    });

    this.logger.log(
      `Initialized ${mockUsers.length} user profiles and ${mockBusinesses.length} business profiles`
    );
  }

  /**
   * Get a single user profile by ID
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      if (!this.isValidUserId(userId)) {
        this.logger.warn(`Invalid user ID provided: ${userId}`);
        return null;
      }

      const key = `user:${userId}`;
      const profile = this.profileCache.get(key) as UserProfile;

      if (profile) {
        this.logger.debug(
          `Retrieved user profile for user ${userId}: ${profile.name}`
        );
        return { ...profile }; // Return a copy
      }

      this.logger.debug(`User profile not found for user ${userId}`);
      return null;
    } catch (error) {
      this.logger.error(`Error retrieving user profile for ${userId}:`, error);
      return null;
    }
  }

  private isValidUserId(userId: string): boolean {
    return userId && typeof userId === 'string' && userId.trim().length > 0;
  }

  /**
   * Get a single business profile by ID
   */
  async getBusinessProfile(
    businessId: string
  ): Promise<BusinessProfile | null> {
    const key = `business:${businessId}`;
    const profile = this.profileCache.get(key) as BusinessProfile;

    if (profile) {
      this.logger.debug(
        `Retrieved business profile for business ${businessId}: ${profile.name}`
      );
      return { ...profile }; // Return a copy
    }

    this.logger.warn(`Business profile not found for business ${businessId}`);
    return null;
  }

  /**
   * Get multiple user profiles by IDs
   */
  async getUserProfiles(userIds: string[]): Promise<UserProfile[]> {
    const profiles: UserProfile[] = [];

    for (const userId of userIds) {
      const profile = await this.getUserProfile(userId);
      if (profile) {
        profiles.push(profile);
      }
    }

    this.logger.debug(
      `Retrieved ${profiles.length}/${userIds.length} user profiles`
    );
    return profiles;
  }

  /**
   * Get multiple business profiles by IDs
   */
  async getBusinessProfiles(businessIds: string[]): Promise<BusinessProfile[]> {
    const profiles: BusinessProfile[] = [];

    for (const businessId of businessIds) {
      const profile = await this.getBusinessProfile(businessId);
      if (profile) {
        profiles.push(profile);
      }
    }

    this.logger.debug(
      `Retrieved ${profiles.length}/${businessIds.length} business profiles`
    );
    return profiles;
  }

  /**
   * Batch get profiles (users and businesses together)
   * This simulates the kaha-main-v3 batch API format
   */
  async getBatchProfiles(request: {
    user_ids?: string[];
    business_ids?: string[];
  }): Promise<{
    users: UserProfile[];
    businesses: BusinessProfile[];
  }> {
    const { user_ids = [], business_ids = [] } = request;

    const users = await this.getUserProfiles(user_ids);
    const businesses = await this.getBusinessProfiles(business_ids);

    this.logger.log(
      `Batch profile request: ${users.length} users, ${businesses.length} businesses`
    );

    return {
      users,
      businesses,
    };
  }

  /**
   * Check if a user exists
   */
  userExists(userId: string): boolean {
    const key = `user:${userId}`;
    return this.profileCache.has(key);
  }

  /**
   * Check if a business exists
   */
  businessExists(businessId: string): boolean {
    const key = `business:${businessId}`;
    return this.profileCache.has(key);
  }

  /**
   * Get all available user IDs (for testing)
   */
  getAvailableUserIds(): string[] {
    const userIds: string[] = [];
    for (const [key, profile] of this.profileCache.entries()) {
      if (key.startsWith("user:") && profile.user_type === "user") {
        userIds.push(profile.id);
      }
    }
    return userIds.sort();
  }

  /**
   * Get all available business IDs (for testing)
   */
  getAvailableBusinessIds(): string[] {
    const businessIds: string[] = [];
    for (const [key, profile] of this.profileCache.entries()) {
      if (key.startsWith("business:") && profile.user_type === "business") {
        businessIds.push(profile.id);
      }
    }
    return businessIds.sort();
  }

  /**
   * Add a new mock user profile (for testing)
   */
  addMockUser(user: UserProfile): void {
    const key = `user:${user.id}`;
    this.profileCache.set(key, { ...user });
    this.logger.debug(`Added mock user profile: ${user.name} (ID: ${user.id})`);
  }

  /**
   * Add a new mock business profile (for testing)
   */
  addMockBusiness(business: BusinessProfile): void {
    const key = `business:${business.id}`;
    this.profileCache.set(key, { ...business });
    this.logger.debug(
      `Added mock business profile: ${business.name} (ID: ${business.id})`
    );
  }

  /**
   * Clear all mock data (for testing)
   */
  clearMockData(): void {
    this.profileCache.clear();
    this.logger.debug("Cleared all mock profile data");
  }

  /**
   * Get profile statistics
   */
  getStats(): {
    totalUsers: number;
    totalBusinesses: number;
    onlineUsers: number;
    onlineBusinesses: number;
  } {
    let totalUsers = 0;
    let totalBusinesses = 0;
    let onlineUsers = 0;
    let onlineBusinesses = 0;

    for (const profile of this.profileCache.values()) {
      if (profile.user_type === "user") {
        totalUsers++;
        if (profile.is_online) onlineUsers++;
      } else if (profile.user_type === "business") {
        totalBusinesses++;
        if (profile.is_online) onlineBusinesses++;
      }
    }

    return {
      totalUsers,
      totalBusinesses,
      onlineUsers,
      onlineBusinesses,
    };
  }
}
