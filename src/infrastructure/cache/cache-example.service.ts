import { Injectable, Logger } from '@nestjs/common';
import { RedisCacheService } from './redis-cache.service';
import { CacheHealthService } from './cache-health.service';

@Injectable()
export class CacheExampleService {
  private readonly logger = new Logger(CacheExampleService.name);

  constructor(
    private readonly cacheService: RedisCacheService,
    private readonly healthService: CacheHealthService,
  ) {}

  /**
   * Example: Cache user profile data
   */
  async cacheUserProfile(userId: number, profile: any): Promise<void> {
    const key = `profile:user:${userId}`;
    const ttl = 24 * 60 * 60; // 24 hours
    
    try {
      await this.cacheService.set(key, profile, ttl);
      this.logger.log(`Cached user profile for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to cache user profile for user ${userId}:`, error);
    }
  }

  /**
   * Example: Get cached user profile
   */
  async getUserProfile(userId: number): Promise<any | null> {
    const key = `profile:user:${userId}`;
    
    try {
      const profile = await this.cacheService.get(key);
      if (profile) {
        this.logger.log(`Retrieved cached profile for user ${userId}`);
      } else {
        this.logger.log(`No cached profile found for user ${userId}`);
      }
      return profile;
    } catch (error) {
      this.logger.error(`Failed to get user profile for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Example: Cache presence status
   */
  async setUserPresence(userId: number, status: 'online' | 'offline'): Promise<void> {
    const key = `presence:${userId}`;
    const ttl = 30; // 30 seconds
    
    try {
      await this.cacheService.set(key, status, ttl);
      this.logger.log(`Set presence for user ${userId}: ${status}`);
    } catch (error) {
      this.logger.error(`Failed to set presence for user ${userId}:`, error);
    }
  }

  /**
   * Example: Get user presence
   */
  async getUserPresence(userId: number): Promise<string | null> {
    const key = `presence:${userId}`;
    
    try {
      const status = await this.cacheService.get<string>(key);
      return status || 'offline';
    } catch (error) {
      this.logger.error(`Failed to get presence for user ${userId}:`, error);
      return 'offline';
    }
  }

  /**
   * Example: Queue offline messages
   */
  async queueOfflineMessage(userId: number, messageId: number): Promise<void> {
    const key = `queue:${userId}`;
    
    try {
      await this.cacheService.rpush(key, messageId);
      this.logger.log(`Queued message ${messageId} for offline user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to queue message for user ${userId}:`, error);
    }
  }

  /**
   * Example: Get queued messages for user
   */
  async getQueuedMessages(userId: number): Promise<number[]> {
    const key = `queue:${userId}`;
    
    try {
      const messageIds = await this.cacheService.lrange<number>(key, 0, -1);
      if (messageIds.length > 0) {
        // Clear the queue after retrieving
        await this.cacheService.delete(key);
        this.logger.log(`Retrieved ${messageIds.length} queued messages for user ${userId}`);
      }
      return messageIds;
    } catch (error) {
      this.logger.error(`Failed to get queued messages for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Example: Increment unread count
   */
  async incrementUnreadCount(userId: number, conversationId: number): Promise<number> {
    const key = `unread:${userId}:${conversationId}`;
    
    try {
      const count = await this.cacheService.increment(key);
      this.logger.log(`Unread count for user ${userId}, conversation ${conversationId}: ${count}`);
      return count;
    } catch (error) {
      this.logger.error(`Failed to increment unread count:`, error);
      return 0;
    }
  }

  /**
   * Example: Reset unread count
   */
  async resetUnreadCount(userId: number, conversationId: number): Promise<void> {
    const key = `unread:${userId}:${conversationId}`;
    
    try {
      await this.cacheService.delete(key);
      this.logger.log(`Reset unread count for user ${userId}, conversation ${conversationId}`);
    } catch (error) {
      this.logger.error(`Failed to reset unread count:`, error);
    }
  }

  /**
   * Test Redis connectivity and basic operations
   */
  async testRedisConnection(): Promise<{
    connected: boolean;
    basicOperations: boolean;
    details: any;
  }> {
    this.logger.log('Testing Redis connection and basic operations...');

    // Check health
    const healthResult = await this.healthService.checkHealth();
    
    // Test basic operations
    const operationsResult = await this.healthService.testBasicOperations();

    const result = {
      connected: healthResult.status === 'healthy',
      basicOperations: operationsResult.success,
      details: {
        health: healthResult,
        operations: operationsResult,
        metrics: this.cacheService.getMetrics(),
      },
    };

    if (result.connected && result.basicOperations) {
      this.logger.log('✅ Redis connection and operations working correctly');
    } else {
      this.logger.warn('❌ Redis connection or operations failed', result.details);
    }

    return result;
  }
}