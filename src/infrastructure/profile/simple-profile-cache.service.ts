import { Injectable, Logger } from '@nestjs/common';
import { ProfileMockService, UserProfile, BusinessProfile, Profile } from './profile-mock.service';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

@Injectable()
export class SimpleProfileCacheService {
  private readonly logger = new Logger(SimpleProfileCacheService.name);
  private readonly cache = new Map<string, CacheEntry<Profile>>();
  private readonly defaultTtl = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  constructor(private readonly profileMockService: ProfileMockService) {}

  /**
   * Get user profile with caching
   */
  async getUserProfile(userId: number): Promise<UserProfile | null> {
    const cacheKey = `user:${userId}`;
    
    // Check cache first
    const cached = this.getFromCache<UserProfile>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for user ${userId}`);
      return cached;
    }

    // Cache miss - fetch from mock service
    this.logger.debug(`Cache miss for user ${userId}, fetching from mock service`);
    const profile = await this.profileMockService.getUserProfile(userId);
    
    if (profile) {
      this.setCache(cacheKey, profile);
    }

    return profile;
  }

  /**
   * Get business profile with caching
   */
  async getBusinessProfile(businessId: number): Promise<BusinessProfile | null> {
    const cacheKey = `business:${businessId}`;
    
    // Check cache first
    const cached = this.getFromCache<BusinessProfile>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for business ${businessId}`);
      return cached;
    }

    // Cache miss - fetch from mock service
    this.logger.debug(`Cache miss for business ${businessId}, fetching from mock service`);
    const profile = await this.profileMockService.getBusinessProfile(businessId);
    
    if (profile) {
      this.setCache(cacheKey, profile);
    }

    return profile;
  }

  /**
   * Get multiple user profiles with caching
   */
  async getUserProfiles(userIds: number[]): Promise<UserProfile[]> {
    const profiles: UserProfile[] = [];
    const uncachedIds: number[] = [];

    // Check cache for each user
    for (const userId of userIds) {
      const cached = await this.getUserProfile(userId);
      if (cached) {
        profiles.push(cached);
      } else {
        uncachedIds.push(userId);
      }
    }

    this.logger.debug(`Retrieved ${profiles.length}/${userIds.length} user profiles from cache`);
    return profiles;
  }

  /**
   * Get multiple business profiles with caching
   */
  async getBusinessProfiles(businessIds: number[]): Promise<BusinessProfile[]> {
    const profiles: BusinessProfile[] = [];
    const uncachedIds: number[] = [];

    // Check cache for each business
    for (const businessId of businessIds) {
      const cached = await this.getBusinessProfile(businessId);
      if (cached) {
        profiles.push(cached);
      } else {
        uncachedIds.push(businessId);
      }
    }

    this.logger.debug(`Retrieved ${profiles.length}/${businessIds.length} business profiles from cache`);
    return profiles;
  }

  /**
   * Batch get profiles with caching (simulates kaha-main-v3 API)
   */
  async getBatchProfiles(request: {
    user_ids?: number[];
    business_ids?: number[];
  }): Promise<{
    users: UserProfile[];
    businesses: BusinessProfile[];
  }> {
    const { user_ids = [], business_ids = [] } = request;

    const users = await this.getUserProfiles(user_ids);
    const businesses = await this.getBusinessProfiles(business_ids);

    this.logger.log(`Batch profile request: ${users.length} users, ${businesses.length} businesses`);

    return {
      users,
      businesses,
    };
  }

  /**
   * Invalidate cache for a user profile
   */
  invalidateUserProfile(userId: number): void {
    const cacheKey = `user:${userId}`;
    this.cache.delete(cacheKey);
    this.logger.debug(`Invalidated cache for user ${userId}`);
  }

  /**
   * Invalidate cache for a business profile
   */
  invalidateBusinessProfile(businessId: number): void {
    const cacheKey = `business:${businessId}`;
    this.cache.delete(cacheKey);
    this.logger.debug(`Invalidated cache for business ${businessId}`);
  }

  /**
   * Clear all cached profiles
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.log('Cleared all profile cache');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalEntries: number;
    expiredEntries: number;
    hitRate: number;
    cacheSize: number;
  } {
    const now = Date.now();
    let expiredEntries = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry, now)) {
        expiredEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      expiredEntries,
      hitRate: 0, // Would need to track hits/misses for accurate calculation
      cacheSize: this.cache.size,
    };
  }

  /**
   * Clean up expired entries
   */
  cleanupExpiredEntries(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry, now)) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} expired cache entries`);
    }

    return cleanedCount;
  }

  /**
   * Get item from cache if not expired
   */
  private getFromCache<T extends Profile>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (this.isExpired(entry, now)) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set item in cache with TTL
   */
  private setCache(key: string, data: Profile, ttl?: number): void {
    const entry: CacheEntry<Profile> = {
      data: { ...data }, // Store a copy
      timestamp: Date.now(),
      ttl: ttl || this.defaultTtl,
    };

    this.cache.set(key, entry);
    this.logger.debug(`Cached profile: ${key}`);
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry<Profile>, now: number): boolean {
    return (now - entry.timestamp) > entry.ttl;
  }
}