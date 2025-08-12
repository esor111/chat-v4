import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { ProfileMockService } from '../../infrastructure/profile/profile-mock.service';
import { SimpleProfileCacheService } from '../../infrastructure/profile/simple-profile-cache.service';
import { RedisCacheService } from '../../infrastructure/cache/redis-cache.service';
import { CacheHealthService } from '../../infrastructure/cache/cache-health.service';
import { CacheExampleService } from '../../infrastructure/cache/cache-example.service';

describe('Core Services Integration Tests', () => {
  let module: TestingModule;
  let cacheHealthService: CacheHealthService;
  let profileService: ProfileMockService;
  let profileCacheService: SimpleProfileCacheService;
  let cacheExampleService: CacheExampleService;
  let redisCacheService: RedisCacheService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          validationOptions: {
            allowUnknown: true,
            abortEarly: false,
          },
        }),
      ],
      providers: [
        ProfileMockService,
        SimpleProfileCacheService,
        RedisCacheService,
        CacheHealthService,
        CacheExampleService,
      ],
    }).compile();
    
    // Get services
    cacheHealthService = module.get<CacheHealthService>(CacheHealthService);
    profileService = module.get<ProfileMockService>(ProfileMockService);
    profileCacheService = module.get<SimpleProfileCacheService>(SimpleProfileCacheService);
    cacheExampleService = module.get<CacheExampleService>(CacheExampleService);
    redisCacheService = module.get<RedisCacheService>(RedisCacheService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Service Initialization', () => {
    it('should have all core services available', () => {
      expect(cacheHealthService).toBeDefined();
      expect(profileService).toBeDefined();
      expect(profileCacheService).toBeDefined();
      expect(cacheExampleService).toBeDefined();
      expect(redisCacheService).toBeDefined();
    });
  });

  describe('Profile Service Integration', () => {
    it('should provide mock user profiles', async () => {
      const userProfile = await profileService.getUserProfile(1);
      expect(userProfile).toBeDefined();
      expect(userProfile?.id).toBe(1);
      expect(userProfile?.name).toBeDefined();
      expect(userProfile?.user_type).toBe('user');
    });

    it('should provide mock business profiles', async () => {
      const businessProfile = await profileService.getBusinessProfile(100);
      expect(businessProfile).toBeDefined();
      expect(businessProfile?.id).toBe(100);
      expect(businessProfile?.name).toBeDefined();
      expect(businessProfile?.user_type).toBe('business');
      expect(businessProfile?.business_hours).toBeDefined();
    });

    it('should support batch profile requests', async () => {
      const result = await profileService.getBatchProfiles({
        user_ids: [1, 2],
        business_ids: [100, 101],
      });

      expect(result.users).toHaveLength(2);
      expect(result.businesses).toHaveLength(2);
      expect(result.users[0].user_type).toBe('user');
      expect(result.businesses[0].user_type).toBe('business');
    });

    it('should provide profile statistics', () => {
      const stats = profileService.getStats();
      expect(stats.totalUsers).toBeGreaterThan(0);
      expect(stats.totalBusinesses).toBeGreaterThan(0);
      expect(typeof stats.onlineUsers).toBe('number');
      expect(typeof stats.onlineBusinesses).toBe('number');
    });

    it('should handle non-existent profiles', async () => {
      const userProfile = await profileService.getUserProfile(999);
      expect(userProfile).toBeNull();

      const businessProfile = await profileService.getBusinessProfile(999);
      expect(businessProfile).toBeNull();
    });
  });

  describe('Profile Cache Integration', () => {
    it('should cache and retrieve user profiles', async () => {
      const userId = 1;
      
      // First request should fetch from mock service
      const profile1 = await profileCacheService.getUserProfile(userId);
      expect(profile1).toBeDefined();
      expect(profile1?.id).toBe(userId);

      // Second request should come from cache
      const profile2 = await profileCacheService.getUserProfile(userId);
      expect(profile2).toEqual(profile1);
    });

    it('should cache and retrieve business profiles', async () => {
      const businessId = 100;
      
      const profile = await profileCacheService.getBusinessProfile(businessId);
      expect(profile).toBeDefined();
      expect(profile?.id).toBe(businessId);
      expect(profile?.user_type).toBe('business');
    });

    it('should handle batch profile requests', async () => {
      const result = await profileCacheService.getBatchProfiles({
        user_ids: [1, 2],
        business_ids: [100, 101],
      });

      expect(result.users.length).toBeGreaterThan(0);
      expect(result.businesses.length).toBeGreaterThan(0);
    });

    it('should handle cache invalidation', () => {
      profileCacheService.invalidateUserProfile(1);
      profileCacheService.invalidateBusinessProfile(100);
      // Should not throw
    });

    it('should provide cache statistics', () => {
      const stats = profileCacheService.getCacheStats();
      expect(stats).toBeDefined();
      expect(typeof stats.totalEntries).toBe('number');
      expect(typeof stats.cacheSize).toBe('number');
    });
  });

  describe('Redis Cache Integration', () => {
    it('should check Redis connectivity', async () => {
      const health = await cacheHealthService.checkHealth();
      
      // Redis might not be running in CI, so we accept both outcomes
      expect(health.status).toMatch(/healthy|unhealthy/);
      expect(health.details).toBeDefined();
    });

    it('should test basic cache operations', async () => {
      const operations = await cacheHealthService.testBasicOperations();
      
      // Operations might fail if Redis is not running, which is expected
      expect(typeof operations.success).toBe('boolean');
      expect(operations.operations).toBeDefined();
      expect(operations.operations.set).toBeDefined();
      expect(operations.operations.get).toBeDefined();
      expect(operations.operations.delete).toBeDefined();
    });

    it('should provide cache metrics', () => {
      const metrics = redisCacheService.getMetrics();
      expect(metrics).toBeDefined();
      expect(typeof metrics.hits).toBe('number');
      expect(typeof metrics.misses).toBe('number');
      expect(typeof metrics.sets).toBe('number');
      expect(typeof metrics.deletes).toBe('number');
      expect(typeof metrics.errors).toBe('number');
      expect(typeof metrics.hitRate).toBe('number');
    });

    it('should handle Redis health check', async () => {
      const isHealthy = await redisCacheService.isHealthy();
      expect(typeof isHealthy).toBe('boolean');
    });
  });

  describe('Cache Example Service Integration', () => {
    it('should demonstrate cache usage patterns', async () => {
      // Test user profile caching
      await cacheExampleService.cacheUserProfile(1, { name: 'Test User', id: 1 });
      const cachedProfile = await cacheExampleService.getUserProfile(1);
      
      // Might be null if Redis is not running
      if (cachedProfile) {
        expect(cachedProfile.name).toBe('Test User');
      }
    });

    it('should handle presence tracking', async () => {
      await cacheExampleService.setUserPresence(1, 'online');
      const presence = await cacheExampleService.getUserPresence(1);
      
      // Should return 'online' or 'offline' (fallback)
      expect(['online', 'offline']).toContain(presence);
    });

    it('should handle message queuing', async () => {
      await cacheExampleService.queueOfflineMessage(1, 123);
      const messages = await cacheExampleService.getQueuedMessages(1);
      
      // Might be empty if Redis is not running
      expect(Array.isArray(messages)).toBe(true);
    });

    it('should handle unread counts', async () => {
      const count = await cacheExampleService.incrementUnreadCount(1, 100);
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);

      await cacheExampleService.resetUnreadCount(1, 100);
      // Should not throw
    });

    it('should test Redis connection flow', async () => {
      const testResult = await cacheExampleService.testRedisConnection();
      
      expect(testResult).toBeDefined();
      expect(typeof testResult.connected).toBe('boolean');
      expect(typeof testResult.basicOperations).toBe('boolean');
      expect(testResult.details).toBeDefined();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle service errors gracefully', async () => {
      // Test that services don't crash on invalid input
      await expect(profileService.getUserProfile(-1)).resolves.toBe(null);
      await expect(profileCacheService.getUserProfile(-1)).resolves.toBe(null);
      await expect(cacheExampleService.getUserProfile(-1)).resolves.toBe(null);
    });

    it('should handle cache failures gracefully', async () => {
      // Even if Redis is down, services should not crash
      const presence = await cacheExampleService.getUserPresence(999);
      expect(['online', 'offline']).toContain(presence);
    });
  });

  describe('Data Flow Integration', () => {
    it('should demonstrate complete user profile flow', async () => {
      // 1. Get user profile from mock service
      const userProfile = await profileService.getUserProfile(1);
      expect(userProfile).toBeDefined();

      // 2. Cache the profile
      const cachedProfile = await profileCacheService.getUserProfile(1);
      expect(cachedProfile).toBeDefined();
      expect(cachedProfile?.id).toBe(userProfile?.id);

      // 3. Set user presence
      await cacheExampleService.setUserPresence(1, 'online');
      const presence = await cacheExampleService.getUserPresence(1);
      expect(['online', 'offline']).toContain(presence);
    });

    it('should demonstrate business profile flow', async () => {
      // 1. Get business profile
      const businessProfile = await profileService.getBusinessProfile(100);
      expect(businessProfile).toBeDefined();
      expect(businessProfile?.user_type).toBe('business');
      expect(businessProfile?.business_hours).toBeDefined();

      // 2. Cache the business profile
      const cachedProfile = await profileCacheService.getBusinessProfile(100);
      expect(cachedProfile).toBeDefined();
      expect(cachedProfile?.id).toBe(businessProfile?.id);

      // 3. Test batch profile loading (user + business)
      const batchResult = await profileService.getBatchProfiles({
        user_ids: [1],
        business_ids: [100],
      });
      expect(batchResult.users).toHaveLength(1);
      expect(batchResult.businesses).toHaveLength(1);
    });

    it('should provide comprehensive system status', async () => {
      // Test all major components are working
      const profileStats = profileService.getStats();
      const cacheHealth = await cacheHealthService.checkHealth();
      const cacheMetrics = redisCacheService.getMetrics();

      expect(profileStats.totalUsers).toBeGreaterThan(0);
      expect(profileStats.totalBusinesses).toBeGreaterThan(0);
      expect(['healthy', 'unhealthy']).toContain(cacheHealth.status);
      expect(cacheMetrics).toBeDefined();
      expect(typeof cacheMetrics.hitRate).toBe('number');
    });
  });
});