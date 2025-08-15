import { UserProfile as DomainUserProfile, UserProfileData } from "@domain/value-objects/user-profile.vo";
import { UserProfile as InfraUserProfile, BusinessProfile } from "./profile-mock.service";

/**
 * Adapter to convert between infrastructure and domain profile models
 */
export class ProfileAdapter {
  /**
   * Convert infrastructure UserProfile to domain UserProfile
   */
  static toDomain(infraProfile: InfraUserProfile): DomainUserProfile {
    if (!infraProfile?.id || !infraProfile?.name) {
      throw new Error("Invalid infrastructure profile: missing required fields");
    }

    const profileData: UserProfileData = {
      userId: infraProfile.id,
      name: infraProfile.name,
      avatar: infraProfile.avatar_url,
      status: infraProfile.is_online ? "online" : "offline",
    };

    return DomainUserProfile.create(profileData);
  }

  /**
   * Convert infrastructure BusinessProfile to domain UserProfile
   */
  static businessToDomain(businessProfile: BusinessProfile): DomainUserProfile {
    const profileData: UserProfileData = {
      userId: businessProfile.id,
      name: businessProfile.name,
      avatar: businessProfile.avatar_url,
      status: businessProfile.is_online ? "online" : "offline",
    };

    return DomainUserProfile.create(profileData);
  }

  /**
   * Convert domain UserProfile to infrastructure format
   */
  static toInfrastructure(domainProfile: DomainUserProfile): InfraUserProfile {
    return {
      id: domainProfile.userId,
      name: domainProfile.name,
      avatar_url: domainProfile.avatar,
      user_type: "user",
      is_online: domainProfile.isOnline(),
    };
  }

  /**
   * Convert multiple infrastructure profiles to domain profiles
   */
  static batchToDomain(
    users: InfraUserProfile[],
    businesses: BusinessProfile[]
  ): DomainUserProfile[] {
    const domainProfiles: DomainUserProfile[] = [];

    users.forEach(user => {
      try {
        domainProfiles.push(this.toDomain(user));
      } catch (error) {
        console.warn(`Failed to convert user profile ${user.id}:`, error);
      }
    });

    businesses.forEach(business => {
      try {
        domainProfiles.push(this.businessToDomain(business));
      } catch (error) {
        console.warn(`Failed to convert business profile ${business.id}:`, error);
      }
    });

    return domainProfiles;
  }
}