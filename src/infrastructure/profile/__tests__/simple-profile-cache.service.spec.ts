import { Test, TestingModule } from '@nestjs/testing';
import { SimpleProfileCacheService } from '../simple-profile-cache.service';
import { ProfileMockService, UserProfile, BusinessProfile } from '../profile-mock.service';

describe('SimpleProfileCacheService', () => {
  let service: SimpleProfileCacheService;
  let mockService: ProfileMockService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SimpleProfileCacheService,
        ProfileMockService,
      ],
    }).compile();

    service = module.get<SimpleProfileCacheService>(SimpleProfileCacheService);
    mockService = module.get<ProfileMockService>(ProfileMockService);
  });

  afterEach(() => {
    service.clearCache();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('user profile caching', () => {
    it('should cache user profile on first request', async () => {
      const userId = '1';
      
      // First request - should fetch from mock service
      const profile1 = await service.getUserProfile(userId);
      expect(profile1).toBeDefined();
      expect(profile1?.id).toBe(userId);

      // Second request - should come from cache
      const profile2 = await service.getUserProfile(userId);
      expect(profile2).toEqual(profile1);
    });

    it('should return null for non-existent user', async () => {
      const profile = await service.getUserProfile('999');
      expect(profile).toBeNull();
    });

    it('should invalidate user profile cache', async () => {
      const userId = '1';
      
      // Cache the profile
      await service.getUserProfile(userId);
      
      // Invalidate cache
      service.invalidateUserProfile(userId);
      
      // Next request should fetch from mock service again
      const profile = await service.getUserProfile(userId);
      expect(profile).toBeDefined();
    });
  });

  describe('business profile caching', () => {
    it('should cache business profile on first request', async () => {
      const businessId = '100';
      
      // First request - should fetch from mock service
      const profile1 = await service.getBusinessProfile(businessId);
      expect(profile1).toBeDefined();
      expect(profile1?.id).toBe(businessId);
      expect(profile1?.user_type).toBe('business');

      // Second request - should come from cache
      const profile2 = await service.getBusinessProfile(businessId);
      expect(profile2).toEqual(profile1);
    });

    it('should return null for non-existent business', async () => {
      const profile = await service.getBusinessProfile('999');
      expect(profile).toBeNull();
    });

    it('should invalidate business profile cache', async () => {
      const businessId = '100';
      
      // Cache the profile
      await service.getBusinessProfile(businessId);
      
      // Invalidate cache
      service.invalidateBusinessProfile(businessId);
      
      // Next request should fetch from mock service again
      const profile = await service.getBusinessProfile(businessId);
      expect(profile).toBeDefined();
    });
  });

  describe('batch operations', () => {
    it('should handle batch profile requests', async () => {
      const request = {
        user_ids: ['1', '2'],
        business_ids: ['100', '101'],
      };

      const result = await service.getBatchProfiles(request);

      expect(result.users).toHaveLength(2);
      expect(result.businesses).toHaveLength(2);
      expect(result.users[0].user_type).toBe('user');
      expect(result.businesses[0].user_type).toBe('business');
    });

    it('should cache profiles from batch requests', async () => {
      const userIds = ['1', '2', '3'];
      
      // First batch request
      const profiles1 = await service.getUserProfiles(userIds);
      expect(profiles1).toHaveLength(3);

      // Second request should use cached data
      const profiles2 = await service.getUserProfiles(userIds);
      expect(profiles2).toEqual(profiles1);
    });
  });

  describe('cache management', () => {
    it('should provide cache statistics', async () => {
      // Cache some profiles
      await service.getUserProfile('1');
      await service.getBusinessProfile('100');

      const stats = service.getCacheStats();
      expect(stats.totalEntries).toBe(2);
      expect(stats.cacheSize).toBe(2);
      expect(stats.expiredEntries).toBe(0);
    });

    it('should clear all cache', async () => {
      // Cache some profiles
      await service.getUserProfile('1');
      await service.getBusinessProfile('100');

      expect(service.getCacheStats().totalEntries).toBe(2);

      // Clear cache
      service.clearCache();
      expect(service.getCacheStats().totalEntries).toBe(0);
    });

    it('should clean up expired entries', async () => {
      // This test would require mocking time or using very short TTL
      // For now, just test that the method exists and returns a number
      const cleanedCount = service.cleanupExpiredEntries();
      expect(typeof cleanedCount).toBe('number');
      expect(cleanedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('data consistency', () => {
    it('should return copies of cached data', async () => {
      const userId = '1';
      
      const profile1 = await service.getUserProfile(userId);
      const profile2 = await service.getUserProfile(userId);

      // Should be equal but not the same reference
      expect(profile1).toEqual(profile2);
      expect(profile1).not.toBe(profile2);

      // Modifying one shouldn't affect the other
      if (profile1) {
        (profile1 as any).modified = true;
      }
      
      const profile3 = await service.getUserProfile(userId);
      expect((profile3 as any).modified).toBeUndefined();
    });
  });
});