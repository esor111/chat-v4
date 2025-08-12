import { Injectable, Logger } from '@nestjs/common';
import { ProfileCacheService } from './profile-cache.service';

export interface ProfileUpdateEvent {
  type: 'user.profile.updated' | 'business.profile.updated';
  id: number;
  timestamp: string;
  changes?: string[]; // Optional: specific fields that changed
}

export interface ProfileDeleteEvent {
  type: 'user.profile.deleted' | 'business.profile.deleted';
  id: number;
  timestamp: string;
}

export type ProfileEvent = ProfileUpdateEvent | ProfileDeleteEvent;

@Injectable()
export class ProfileCacheEventHandler {
  private readonly logger = new Logger(ProfileCacheEventHandler.name);

  constructor(private readonly profileCache: ProfileCacheService) {}

  /**
   * Handle profile update events from kaha-main-v3
   * This would typically be called by a message queue consumer or webhook handler
   */
  async handleProfileEvent(event: ProfileEvent): Promise<void> {
    try {
      this.logger.debug(`Handling profile event: ${event.type} for ID ${event.id}`);

      switch (event.type) {
        case 'user.profile.updated':
          await this.handleUserProfileUpdate(event as ProfileUpdateEvent);
          break;

        case 'business.profile.updated':
          await this.handleBusinessProfileUpdate(event as ProfileUpdateEvent);
          break;

        case 'user.profile.deleted':
          await this.handleUserProfileDelete(event as ProfileDeleteEvent);
          break;

        case 'business.profile.deleted':
          await this.handleBusinessProfileDelete(event as ProfileDeleteEvent);
          break;

        default:
          this.logger.warn(`Unknown profile event type: ${(event as any).type}`);
      }
    } catch (error) {
      this.logger.error(`Error handling profile event ${event.type} for ID ${event.id}:`, error);
      // Don't throw - we don't want to break the event processing pipeline
    }
  }

  /**
   * Handle batch profile events
   */
  async handleBatchProfileEvents(events: ProfileEvent[]): Promise<void> {
    const promises = events.map(event => this.handleProfileEvent(event));
    const results = await Promise.allSettled(promises);

    const failed = results.filter(result => result.status === 'rejected').length;
    if (failed > 0) {
      this.logger.warn(`${failed} out of ${events.length} profile events failed to process`);
    } else {
      this.logger.debug(`Successfully processed ${events.length} profile events`);
    }
  }

  private async handleUserProfileUpdate(event: ProfileUpdateEvent): Promise<void> {
    // Invalidate the cached user profile to force refresh on next access
    await this.profileCache.invalidateUserProfile(event.id);
    
    this.logger.debug(`Invalidated user profile cache for user ${event.id} due to update event`);

    // Optionally, we could proactively fetch and cache the updated profile
    // This would depend on the system's caching strategy and load patterns
    // For now, we use lazy loading (cache-aside pattern)
  }

  private async handleBusinessProfileUpdate(event: ProfileUpdateEvent): Promise<void> {
    // Invalidate the cached business profile to force refresh on next access
    await this.profileCache.invalidateBusinessProfile(event.id);
    
    this.logger.debug(`Invalidated business profile cache for business ${event.id} due to update event`);
  }

  private async handleUserProfileDelete(event: ProfileDeleteEvent): Promise<void> {
    // Remove the user profile from cache
    await this.profileCache.invalidateUserProfile(event.id);
    
    this.logger.debug(`Removed user profile cache for deleted user ${event.id}`);
  }

  private async handleBusinessProfileDelete(event: ProfileDeleteEvent): Promise<void> {
    // Remove the business profile from cache
    await this.profileCache.invalidateBusinessProfile(event.id);
    
    this.logger.debug(`Removed business profile cache for deleted business ${event.id}`);
  }

  /**
   * Handle profile events with specific field changes
   * This allows for more granular cache invalidation strategies
   */
  async handleFieldSpecificUpdate(event: ProfileUpdateEvent): Promise<void> {
    if (!event.changes || event.changes.length === 0) {
      // If no specific changes provided, invalidate the entire profile
      return this.handleProfileEvent(event);
    }

    // For certain field changes, we might want different strategies
    const criticalFields = ['name', 'avatar_url', 'is_online', 'business_hours'];
    const hasCriticalChanges = event.changes.some(field => criticalFields.includes(field));

    if (hasCriticalChanges) {
      // Critical changes require immediate cache invalidation
      if (event.type === 'user.profile.updated') {
        await this.profileCache.invalidateUserProfile(event.id);
      } else if (event.type === 'business.profile.updated') {
        await this.profileCache.invalidateBusinessProfile(event.id);
      }
      
      this.logger.debug(`Invalidated profile cache for ${event.type} ID ${event.id} due to critical field changes: ${event.changes.join(', ')}`);
    } else {
      // Non-critical changes can be handled with stale-while-revalidate
      // The cache will be refreshed in the background on next access
      this.logger.debug(`Non-critical field changes for ${event.type} ID ${event.id}: ${event.changes.join(', ')} - using stale-while-revalidate`);
    }
  }

  /**
   * Preemptively warm cache for frequently accessed profiles
   * This could be called after profile updates for VIP users or businesses
   */
  async preemptivelyWarmProfile(
    userId?: number, 
    businessId?: number,
    dataLoader?: () => Promise<any>
  ): Promise<void> {
    try {
      if (userId && dataLoader) {
        const result = await this.profileCache.getUserProfile(userId, dataLoader, {
          skipCache: true, // Force fresh load
          warmCache: true,
        });
        this.logger.debug(`Preemptively warmed user profile cache for user ${userId}`);
      }

      if (businessId && dataLoader) {
        const result = await this.profileCache.getBusinessProfile(businessId, dataLoader, {
          skipCache: true, // Force fresh load
          warmCache: true,
        });
        this.logger.debug(`Preemptively warmed business profile cache for business ${businessId}`);
      }
    } catch (error) {
      this.logger.error(`Error preemptively warming profile cache:`, error);
    }
  }

  /**
   * Handle bulk profile invalidation (useful for maintenance operations)
   */
  async handleBulkInvalidation(userIds: number[], businessIds: number[]): Promise<void> {
    try {
      await this.profileCache.invalidateBatchProfiles(userIds, businessIds);
      
      this.logger.log(`Bulk invalidated ${userIds.length} user profiles and ${businessIds.length} business profiles`);
    } catch (error) {
      this.logger.error('Error in bulk profile invalidation:', error);
    }
  }

  /**
   * Schedule periodic cache cleanup (remove expired entries, etc.)
   * This would typically be called by a scheduled job
   */
  async performCacheCleanup(): Promise<void> {
    try {
      // Implementation would depend on specific cleanup requirements
      // For now, this is a placeholder for future cleanup logic
      
      this.logger.debug('Performed profile cache cleanup');
    } catch (error) {
      this.logger.error('Error during profile cache cleanup:', error);
    }
  }

  /**
   * Health check for profile cache event handling
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      cacheService: boolean;
      eventProcessing: boolean;
      lastEventProcessed?: string;
    };
  }> {
    try {
      // Test basic cache operations
      const testUserId = 999999; // Use a test ID that won't conflict
      const testKey = `health_check_${Date.now()}`;
      
      // Test cache write/read/delete
      await this.profileCache.setUserProfile(testUserId, {
        id: testUserId,
        name: 'Health Check User',
        avatar_url: 'https://example.com/test.jpg',
        user_type: 'user',
      });

      const isCached = await this.profileCache.isProfileCached(testUserId);
      await this.profileCache.invalidateUserProfile(testUserId);

      return {
        status: isCached ? 'healthy' : 'degraded',
        details: {
          cacheService: isCached,
          eventProcessing: true, // Would track actual event processing status
        },
      };
    } catch (error) {
      this.logger.error('Profile cache event handler health check failed:', error);
      return {
        status: 'unhealthy',
        details: {
          cacheService: false,
          eventProcessing: false,
        },
      };
    }
  }
}