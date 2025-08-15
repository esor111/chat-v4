import { UserProfile } from '../value-objects/user-profile.vo';

export interface BatchProfileRequest {
  user_ids?: string[];
  business_ids?: string[];
}

export interface BatchProfileResponse {
  users: Array<{
    id: string;
    name: string;
    avatar_url?: string;
    user_type: 'user';
    is_online?: boolean;
  }>;
  businesses: Array<{
    id: string;
    name: string;
    avatar_url?: string;
    user_type: 'business';
    is_online: boolean;
    business_hours?: {
      open: string;
      close: string;
      timezone: string;
    };
  }>;
}

export interface IProfileService {
  /**
   * Get a single user profile by ID
   */
  getUserProfile(userId: string): Promise<UserProfile | null>;

  /**
   * Get multiple profiles in batch
   */
  getBatchProfiles(request: BatchProfileRequest): Promise<BatchProfileResponse>;

  /**
   * Check if a user exists
   */
  userExists(userId: string): Promise<boolean>;
}