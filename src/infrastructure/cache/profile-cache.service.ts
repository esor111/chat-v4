import { Injectable, Logger, Inject } from '@nestjs/common';
import { ICacheService, CACHE_SERVICE_TOKEN } from './cache.interface';
import { CacheAsideService } from './cache-aside.service';
import { CacheKeyStrategyService } from './cache-key-strategy.service';
import { CacheMetricsService } from './cache-metrics.service';

export interface UserProfile {
  id: number;
  name: string;
  avatar_url: string;
  user_type: 'user';
  email?: string;
  phone?: string;
  is_verified?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BusinessProfile {
  id: number;
  name: string;
  avatar_url: string;
  user_type: 'business';
  description?: string;
  website?: string;
  phone?: string;
  email?: string;
  is_online?: boolean;
  business_hours?: {
    open: string;
    close: string;
    timezone: string;
  };
  created_at?: string;
  updated_at?: string;
}

export type Profile = UserProfile | BusinessProfile;

export interface ProfileCacheOptions {
  ttl?: number; // Time to live in seconds
  staleMarkerTtl?: number; // Stale marker TTL in seconds
  skipCache?: boolean; // Skip cache and load fresh data
  warmCache?: boolean; // Warm cache after loading
}

export interface ProfileCacheResult<T extends Profile> {
  profile: T;
  fromCache: boolean;
  isStale: boolean;
  loadedAt: Date;
}

export interface BatchProfileResult {
  users: Map<number, UserProfile>;
  businesses: Map<number, BusinessProfile>;
  fromCache: {
    users: Set<number>;
    businesses: Set<number>;
  };
  stale: {
    users: Set<number>;
    businesses: Set<number>;
  };
  missing: {
    users: Set<number>;
    businesses: Set<number>;
  };
}

@Injectable()
export class ProfileCacheService {
  private readonly logger = new Logger(ProfileCacheService.name);
  
  // Default cache settings
  private readonly defaultTtl = 24 * 60 * 60; // 24 hours
  private readonly defaultStaleMarkerTtl = 5 * 60; // 5 minutes

  constructor(
    @Inject(CACHE_SERVICE_TOKEN) private readonly cacheService: ICacheService,
    private readonly cacheAside: CacheAsideService,
    private readonly keyStrategy: CacheKeyStrategyService,
    private readonly metricsService: CacheMetricsService,
  ) {}

  /**
   * Get a single user profile with caching
   */
  async getUserProfile(
    userId: number,
    dataLoader: () => Promise<UserProfile>,
    options: ProfileCacheOptions = {}
  ): Promise<ProfileCacheResult<UserProfile>> {
    const startTime = Date.now();
    
    try {
      const key = this.keyStrategy.generateUserProfileKey(userId);
      const {
        ttl = this.defaultTtl,
        staleMarkerTtl = this.defaultStaleMarkerTtl,
        skipCache = false,
      } = options;

      const result = await this.cacheAside.get(
        key,
        dataLoader,
        {
          ttl,
          staleMarkerTtl,
          skipCache,
          staleWhileRevalidate: true,
        }
      );

      const profileResult: ProfileCacheResult<UserProfile> = {
        profile: result.data,
        fromCache: result.fromCache,
        isStale: result.isStale,
        loadedAt: new Date(),
      };

      this.metricsService.recordOperation('getUserProfile', Date.now() - startTime, true);
      this.logger.debug(`User profile ${userId} - fromCache: ${result.fromCache}, isStale: ${result.isStale}`);

      return profileResult;
    } catch (error) {
      this.metricsService.recordOperation('getUserProfile', Date.now() - startTime, false);
      this.logger.error(`Error getting user profile ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get a single business profile with caching
   */
  async getBusinessProfile(
    businessId: number,
    dataLoader: () => Promise<BusinessProfile>,
    options: ProfileCacheOptions = {}
  ): Promise<ProfileCacheResult<BusinessProfile>> {
    const startTime = Date.now();
    
    try {
      const key = this.keyStrategy.generateBusinessProfileKey(businessId);
      const {
        ttl = this.defaultTtl,
        staleMarkerTtl = this.defaultStaleMarkerTtl,
        skipCache = false,
      } = options;

      const result = await this.cacheAside.get(
        key,
        dataLoader,
        {
          ttl,
          staleMarkerTtl,
          skipCache,
          staleWhileRevalidate: true,
        }
      );

      const profileResult: ProfileCacheResult<BusinessProfile> = {
        profile: result.data,
        fromCache: result.fromCache,
        isStale: result.isStale,
        loadedAt: new Date(),
      };

      this.metricsService.recordOperation('getBusinessProfile', Date.now() - startTime, true);
      this.logger.debug(`Business profile ${businessId} - fromCache: ${result.fromCache}, isStale: ${result.isStale}`);

      return profileResult;
    } catch (error) {
      this.metricsService.recordOperation('getBusinessProfile', Date.now() - startTime, false);
      this.logger.error(`Error getting business profile ${businessId}:`, error);
      throw error;
    }
  }

  /**
   * Batch fetch user and business profiles with optimized caching
   */
  async getBatchProfiles(
    userIds: number[],
    businessIds: number[],
    dataLoader: (missingUserIds: number[], missingBusinessIds: number[]) => Promise<{
      users: Map<number, UserProfile>;
      businesses: Map<number, BusinessProfile>;
    }>,
    options: ProfileCacheOptions = {}
  ): Promise<BatchProfileResult> {
    const startTime = Date.now();
    
    try {
      const {
        ttl = this.defaultTtl,
        staleMarkerTtl = this.defaultStaleMarkerTtl,
      } = options;

      // Prepare keys for batch operation
      const userKeys = userIds.map(id => this.keyStrategy.generateUserProfileKey(id));
      const businessKeys = businessIds.map(id => this.keyStrategy.generateBusinessProfileKey(id));
      const allKeys = [...userKeys, ...businessKeys];

      // Create mappings
      const keyToUserId = new Map(userKeys.map((key, index) => [key, userIds[index]]));
      const keyToBusinessId = new Map(businessKeys.map((key, index) => [key, businessIds[index]]));

      // Batch get from cache
      const cacheResults = await this.cacheAside.batchGet(
        allKeys,
        async (missingKeys: string[]) => {
          // Separate missing keys by type
          const missingUserIds: number[] = [];
          const missingBusinessIds: number[] = [];

          for (const key of missingKeys) {
            if (keyToUserId.has(key)) {
              missingUserIds.push(keyToUserId.get(key)!);
            } else if (keyToBusinessId.has(key)) {
              missingBusinessIds.push(keyToBusinessId.get(key)!);
            }
          }

          this.logger.debug(`Loading ${missingUserIds.length} users and ${missingBusinessIds.length} businesses from data source`);

          // Load missing profiles
          const loadedData = await dataLoader(missingUserIds, missingBusinessIds);
          
          // Convert to key-based map for cache-aside service
          const keyDataMap = new Map<string, Profile>();
          
          for (const [userId, profile] of loadedData.users.entries()) {
            const key = this.keyStrategy.generateUserProfileKey(userId);
            keyDataMap.set(key, profile);
          }
          
          for (const [businessId, profile] of loadedData.businesses.entries()) {
            const key = this.keyStrategy.generateBusinessProfileKey(businessId);
            keyDataMap.set(key, profile);
          }

          return keyDataMap;
        },
        { ttl, staleMarkerTtl, staleWhileRevalidate: true }
      );

      // Process results and build response
      const result: BatchProfileResult = {
        users: new Map(),
        businesses: new Map(),
        fromCache: {
          users: new Set(),
          businesses: new Set(),
        },
        stale: {
          users: new Set(),
          businesses: new Set(),
        },
        missing: {
          users: new Set(),
          businesses: new Set(),
        },
      };

      // Process user results
      for (const [key, cacheResult] of cacheResults.entries()) {
        if (keyToUserId.has(key)) {
          const userId = keyToUserId.get(key)!;
          const profile = cacheResult.data as UserProfile;
          
          result.users.set(userId, profile);
          
          if (cacheResult.fromCache) {
            result.fromCache.users.add(userId);
          }
          
          if (cacheResult.isStale) {
            result.stale.users.add(userId);
          }
        }
      }

      // Process business results
      for (const [key, cacheResult] of cacheResults.entries()) {
        if (keyToBusinessId.has(key)) {
          const businessId = keyToBusinessId.get(key)!;
          const profile = cacheResult.data as BusinessProfile;
          
          result.businesses.set(businessId, profile);
          
          if (cacheResult.fromCache) {
            result.fromCache.businesses.add(businessId);
          }
          
          if (cacheResult.isStale) {
            result.stale.businesses.add(businessId);
          }
        }
      }

      // Identify missing profiles
      for (const userId of userIds) {
        if (!result.users.has(userId)) {
          result.missing.users.add(userId);
        }
      }

      for (const businessId of businessIds) {
        if (!result.businesses.has(businessId)) {
          result.missing.businesses.add(businessId);
        }
      }

      this.metricsService.recordOperation('getBatchProfiles', Date.now() - startTime, true);
      
      this.logger.debug(`Batch profiles loaded - Users: ${result.users.size}/${userIds.length}, Businesses: ${result.businesses.size}/${businessIds.length}`);
      this.logger.debug(`Cache stats - Users from cache: ${result.fromCache.users.size}, stale: ${result.stale.users.size}`);
      this.logger.debug(`Cache stats - Businesses from cache: ${result.fromCache.businesses.size}, stale: ${result.stale.businesses.size}`);

      return result;
    } catch (error) {
      this.metricsService.recordOperation('getBatchProfiles', Date.now() - startTime, false);
      this.logger.error('Error in batch profile loading:', error);
      throw error;
    }
  }

  /**
   * Invalidate a user profile from cache
   */
  async invalidateUserProfile(userId: number): Promise<void> {
    try {
      const key = this.keyStrategy.generateUserProfileKey(userId);
      await this.cacheAside.delete(key);
      
      this.logger.debug(`Invalidated user profile cache for user ${userId}`);
    } catch (error) {
      this.logger.error(`Error invalidating user profile ${userId}:`, error);
    }
  }

  /**
   * Invalidate a business profile from cache
   */
  async invalidateBusinessProfile(businessId: number): Promise<void> {
    try {
      const key = this.keyStrategy.generateBusinessProfileKey(businessId);
      await this.cacheAside.delete(key);
      
      this.logger.debug(`Invalidated business profile cache for business ${businessId}`);
    } catch (error) {
      this.logger.error(`Error invalidating business profile ${businessId}:`, error);
    }
  }

  /**
   * Invalidate multiple profiles at once
   */
  async invalidateBatchProfiles(userIds: number[], businessIds: number[]): Promise<void> {
    try {
      const invalidationPromises: Promise<void>[] = [];

      // Add user profile invalidations
      for (const userId of userIds) {
        invalidationPromises.push(this.invalidateUserProfile(userId));
      }

      // Add business profile invalidations
      for (const businessId of businessIds) {
        invalidationPromises.push(this.invalidateBusinessProfile(businessId));
      }

      await Promise.allSettled(invalidationPromises);
      
      this.logger.debug(`Batch invalidated ${userIds.length} user profiles and ${businessIds.length} business profiles`);
    } catch (error) {
      this.logger.error('Error in batch profile invalidation:', error);
    }
  }

  /**
   * Warm cache with profile data
   */
  async warmProfiles(
    users: Map<number, UserProfile>,
    businesses: Map<number, BusinessProfile>,
    options: ProfileCacheOptions = {}
  ): Promise<void> {
    try {
      const {
        ttl = this.defaultTtl,
        staleMarkerTtl = this.defaultStaleMarkerTtl,
      } = options;

      const warmingData = new Map<string, Profile>();

      // Add user profiles
      for (const [userId, profile] of users.entries()) {
        const key = this.keyStrategy.generateUserProfileKey(userId);
        warmingData.set(key, profile);
      }

      // Add business profiles
      for (const [businessId, profile] of businesses.entries()) {
        const key = this.keyStrategy.generateBusinessProfileKey(businessId);
        warmingData.set(key, profile);
      }

      await this.cacheAside.warmCache(warmingData, { ttl, staleMarkerTtl });
      
      this.logger.log(`Warmed cache with ${users.size} user profiles and ${businesses.size} business profiles`);
    } catch (error) {
      this.logger.error('Error warming profile cache:', error);
    }
  }

  /**
   * Get cache statistics for profiles
   */
  async getProfileCacheStats(): Promise<{
    userProfiles: {
      cached: number;
      stale: number;
    };
    businessProfiles: {
      cached: number;
      stale: number;
    };
  }> {
    try {
      // This is a simplified implementation
      // In production, you might want to maintain counters or use Redis SCAN
      return {
        userProfiles: {
          cached: 0, // Would need to implement key counting
          stale: 0,
        },
        businessProfiles: {
          cached: 0,
          stale: 0,
        },
      };
    } catch (error) {
      this.logger.error('Error getting profile cache stats:', error);
      return {
        userProfiles: { cached: 0, stale: 0 },
        businessProfiles: { cached: 0, stale: 0 },
      };
    }
  }

  /**
   * Check if a profile is cached and not stale
   */
  async isProfileCached(userId?: number, businessId?: number): Promise<boolean> {
    try {
      let key: string;
      
      if (userId) {
        key = this.keyStrategy.generateUserProfileKey(userId);
      } else if (businessId) {
        key = this.keyStrategy.generateBusinessProfileKey(businessId);
      } else {
        return false;
      }

      const exists = await this.cacheService.exists(key);
      if (!exists) {
        return false;
      }

      // Check if stale
      const staleMarkerKey = this.keyStrategy.generateStaleMarkerKey('data', key);
      const isStale = await this.cacheService.exists(staleMarkerKey);
      
      return !isStale;
    } catch (error) {
      this.logger.error('Error checking profile cache status:', error);
      return false;
    }
  }

  /**
   * Set profile directly in cache (useful for real-time updates)
   */
  async setUserProfile(userId: number, profile: UserProfile, options: ProfileCacheOptions = {}): Promise<void> {
    try {
      const key = this.keyStrategy.generateUserProfileKey(userId);
      const { ttl = this.defaultTtl } = options;
      
      await this.cacheAside.set(key, profile, { ttl });
      
      this.logger.debug(`Set user profile ${userId} in cache`);
    } catch (error) {
      this.logger.error(`Error setting user profile ${userId} in cache:`, error);
    }
  }

  /**
   * Set business profile directly in cache (useful for real-time updates)
   */
  async setBusinessProfile(businessId: number, profile: BusinessProfile, options: ProfileCacheOptions = {}): Promise<void> {
    try {
      const key = this.keyStrategy.generateBusinessProfileKey(businessId);
      const { ttl = this.defaultTtl } = options;
      
      await this.cacheAside.set(key, profile, { ttl });
      
      this.logger.debug(`Set business profile ${businessId} in cache`);
    } catch (error) {
      this.logger.error(`Error setting business profile ${businessId} in cache:`, error);
    }
  }
}