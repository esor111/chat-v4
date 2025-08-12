import { Injectable, Logger } from '@nestjs/common';
import { ProfileCacheService, UserProfile, BusinessProfile } from './profile-cache.service';
import { ProfileCacheEventHandler, ProfileEvent } from './profile-cache-event.handler';

/**
 * Example service demonstrating how to integrate profile caching
 * with the chat microservice system
 */
@Injectable()
export class ProfileCacheIntegrationExample {
  private readonly logger = new Logger(ProfileCacheIntegrationExample.name);

  constructor(
    private readonly profileCache: ProfileCacheService,
    private readonly eventHandler: ProfileCacheEventHandler,
  ) {}

  /**
   * Example: Load user profile for chat message display
   */
  async loadUserProfileForMessage(userId: number): Promise<UserProfile> {
    return (await this.profileCache.getUserProfile(
      userId,
      async () => {
        // Simulate API call to kaha-main-v3
        this.logger.log(`Loading user profile from kaha-main-v3 API for user ${userId}`);
        
        // In real implementation, this would call the kaha-main-v3 batch API
        return {
          id: userId,
          name: `User ${userId}`,
          avatar_url: `https://cdn.example.com/users/${userId}.jpg`,
          user_type: 'user',
          email: `user${userId}@example.com`,
          is_verified: Math.random() > 0.5,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      },
      {
        ttl: 24 * 60 * 60, // 24 hours
        staleMarkerTtl: 5 * 60, // 5 minutes
      }
    )).profile;
  }

  /**
   * Example: Load business profile for business chat
   */
  async loadBusinessProfileForChat(businessId: number): Promise<BusinessProfile> {
    return (await this.profileCache.getBusinessProfile(
      businessId,
      async () => {
        // Simulate API call to kaha-main-v3
        this.logger.log(`Loading business profile from kaha-main-v3 API for business ${businessId}`);
        
        return {
          id: businessId,
          name: `Business ${businessId}`,
          avatar_url: `https://cdn.example.com/businesses/${businessId}.png`,
          user_type: 'business',
          description: `Description for business ${businessId}`,
          website: `https://business${businessId}.com`,
          phone: `+1-555-${businessId.toString().padStart(4, '0')}`,
          email: `contact@business${businessId}.com`,
          is_online: Math.random() > 0.3, // 70% chance of being online
          business_hours: {
            open: '09:00',
            close: '17:00',
            timezone: 'UTC',
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
    )).profile;
  }

  /**
   * Example: Batch load profiles for chat list
   */
  async loadProfilesForChatList(
    userIds: number[],
    businessIds: number[]
  ): Promise<{
    users: Map<number, UserProfile>;
    businesses: Map<number, BusinessProfile>;
    cacheStats: {
      userHitRate: number;
      businessHitRate: number;
      totalHitRate: number;
    };
  }> {
    const result = await this.profileCache.getBatchProfiles(
      userIds,
      businessIds,
      async (missingUserIds: number[], missingBusinessIds: number[]) => {
        // Simulate batch API call to kaha-main-v3
        this.logger.log(`Batch loading ${missingUserIds.length} users and ${missingBusinessIds.length} businesses from API`);
        
        const users = new Map<number, UserProfile>();
        const businesses = new Map<number, BusinessProfile>();

        // Load missing users
        for (const userId of missingUserIds) {
          users.set(userId, {
            id: userId,
            name: `User ${userId}`,
            avatar_url: `https://cdn.example.com/users/${userId}.jpg`,
            user_type: 'user',
            email: `user${userId}@example.com`,
            is_verified: Math.random() > 0.5,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }

        // Load missing businesses
        for (const businessId of missingBusinessIds) {
          businesses.set(businessId, {
            id: businessId,
            name: `Business ${businessId}`,
            avatar_url: `https://cdn.example.com/businesses/${businessId}.png`,
            user_type: 'business',
            description: `Description for business ${businessId}`,
            is_online: Math.random() > 0.3,
            business_hours: {
              open: '09:00',
              close: '17:00',
              timezone: 'UTC',
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }

        return { users, businesses };
      }
    );

    // Calculate cache hit rates
    const userHitRate = userIds.length > 0 ? result.fromCache.users.size / userIds.length : 0;
    const businessHitRate = businessIds.length > 0 ? result.fromCache.businesses.size / businessIds.length : 0;
    const totalRequests = userIds.length + businessIds.length;
    const totalHits = result.fromCache.users.size + result.fromCache.businesses.size;
    const totalHitRate = totalRequests > 0 ? totalHits / totalRequests : 0;

    this.logger.log(`Profile batch load completed - User hit rate: ${(userHitRate * 100).toFixed(1)}%, Business hit rate: ${(businessHitRate * 100).toFixed(1)}%`);

    return {
      users: result.users,
      businesses: result.businesses,
      cacheStats: {
        userHitRate,
        businessHitRate,
        totalHitRate,
      },
    };
  }

  /**
   * Example: Handle profile update event from kaha-main-v3
   */
  async handleProfileUpdateFromWebhook(eventPayload: any): Promise<void> {
    try {
      // Parse the webhook payload into our event format
      const event: ProfileEvent = {
        type: eventPayload.event_type, // e.g., 'user.profile.updated'
        id: eventPayload.entity_id,
        timestamp: eventPayload.timestamp || new Date().toISOString(),
        changes: eventPayload.changed_fields, // Optional field changes
      };

      await this.eventHandler.handleProfileEvent(event);
      
      this.logger.log(`Successfully processed profile update event: ${event.type} for ID ${event.id}`);
    } catch (error) {
      this.logger.error('Error processing profile update webhook:', error);
      throw error;
    }
  }

  /**
   * Example: Preemptively warm cache for VIP users
   */
  async warmVipUserProfiles(vipUserIds: number[]): Promise<void> {
    const profiles = new Map<number, UserProfile>();

    // Load VIP user profiles
    for (const userId of vipUserIds) {
      try {
        const profile = await this.loadUserProfileForMessage(userId);
        profiles.set(userId, profile);
      } catch (error) {
        this.logger.error(`Error loading VIP user profile ${userId}:`, error);
      }
    }

    // Warm the cache
    await this.profileCache.warmProfiles(profiles, new Map());
    
    this.logger.log(`Warmed cache for ${profiles.size} VIP user profiles`);
  }

  /**
   * Example: Handle business going online/offline
   */
  async handleBusinessStatusChange(businessId: number, isOnline: boolean): Promise<void> {
    try {
      // Invalidate the business profile cache to ensure fresh status
      await this.profileCache.invalidateBusinessProfile(businessId);
      
      // Optionally, preemptively load the updated profile
      if (isOnline) {
        await this.loadBusinessProfileForChat(businessId);
      }
      
      this.logger.log(`Business ${businessId} status changed to ${isOnline ? 'online' : 'offline'} - cache invalidated`);
    } catch (error) {
      this.logger.error(`Error handling business status change for ${businessId}:`, error);
    }
  }

  /**
   * Example: Get enriched conversation participants with profiles
   */
  async getConversationParticipantsWithProfiles(participantIds: {
    users: number[];
    businesses: number[];
  }): Promise<{
    users: Array<UserProfile & { participantRole?: string }>;
    businesses: Array<BusinessProfile & { participantRole?: string }>;
  }> {
    const profileResult = await this.loadProfilesForChatList(
      participantIds.users,
      participantIds.businesses
    );

    // Convert to arrays and add participant roles (would come from participants table)
    const users = Array.from(profileResult.users.values()).map(profile => ({
      ...profile,
      participantRole: 'member', // Would be loaded from participants table
    }));

    const businesses = Array.from(profileResult.businesses.values()).map(profile => ({
      ...profile,
      participantRole: 'business', // Would be loaded from participants table
    }));

    return { users, businesses };
  }

  /**
   * Example: Cache maintenance - cleanup stale profiles
   */
  async performCacheMaintenance(): Promise<{
    cleaned: number;
    errors: number;
  }> {
    let cleaned = 0;
    let errors = 0;

    try {
      // Get cache statistics
      const stats = await this.profileCache.getProfileCacheStats();
      
      // Perform cleanup operations
      await this.eventHandler.performCacheCleanup();
      
      this.logger.log(`Cache maintenance completed - cleaned ${cleaned} entries, ${errors} errors`);
      
      return { cleaned, errors };
    } catch (error) {
      this.logger.error('Error during cache maintenance:', error);
      return { cleaned, errors: errors + 1 };
    }
  }

  /**
   * Example: Health check for profile caching system
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      profileCache: boolean;
      eventHandler: boolean;
      cacheHitRate?: number;
      avgLatency?: number;
    };
  }> {
    try {
      // Test profile cache operations
      const testUserId = 999999;
      const startTime = Date.now();
      
      const testProfile = await this.loadUserProfileForMessage(testUserId);
      const latency = Date.now() - startTime;
      
      // Check if profile was cached
      const isCached = await this.profileCache.isProfileCached(testUserId);
      
      // Clean up test data
      await this.profileCache.invalidateUserProfile(testUserId);
      
      // Check event handler health
      const eventHandlerHealth = await this.eventHandler.healthCheck();
      
      const isHealthy = testProfile && eventHandlerHealth.status === 'healthy';
      
      return {
        status: isHealthy ? 'healthy' : 'degraded',
        details: {
          profileCache: !!testProfile,
          eventHandler: eventHandlerHealth.status === 'healthy',
          avgLatency: latency,
        },
      };
    } catch (error) {
      this.logger.error('Profile cache health check failed:', error);
      return {
        status: 'unhealthy',
        details: {
          profileCache: false,
          eventHandler: false,
        },
      };
    }
  }

  /**
   * Example: Profile cache metrics for monitoring
   */
  async getProfileCacheMetrics(): Promise<{
    hitRate: {
      users: number;
      businesses: number;
      overall: number;
    };
    performance: {
      avgLatency: number;
      p95Latency: number;
    };
    volume: {
      totalRequests: number;
      cacheHits: number;
      cacheMisses: number;
    };
  }> {
    try {
      // This would integrate with the metrics service to get real data
      // For now, return mock data structure
      return {
        hitRate: {
          users: 0.85, // 85% hit rate for users
          businesses: 0.92, // 92% hit rate for businesses
          overall: 0.88, // 88% overall hit rate
        },
        performance: {
          avgLatency: 15, // 15ms average
          p95Latency: 45, // 45ms P95
        },
        volume: {
          totalRequests: 10000,
          cacheHits: 8800,
          cacheMisses: 1200,
        },
      };
    } catch (error) {
      this.logger.error('Error getting profile cache metrics:', error);
      throw error;
    }
  }
}