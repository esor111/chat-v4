import { Test, TestingModule } from '@nestjs/testing';
import { ProfileCacheService, UserProfile, BusinessProfile } from '../profile-cache.service';
import { ICacheService, CACHE_SERVICE_TOKEN } from '../cache.interface';
import { CacheAsideService } from '../cache-aside.service';
import { CacheKeyStrategyService } from '../cache-key-strategy.service';
import { CacheMetricsService } from '../cache-metrics.service';

describe('ProfileCacheService', () => {
  let service: ProfileCacheService;
  let mockCacheService: jest.Mocked<ICacheService>;
  let mockCacheAside: jest.Mocked<CacheAsideService>;
  let mockKeyStrategy: jest.Mocked<CacheKeyStrategyService>;
  let mockMetricsService: jest.Mocked<CacheMetricsService>;

  const mockUserProfile: UserProfile = {
    id: 1,
    name: 'John Doe',
    avatar_url: 'https://example.com/avatar1.jpg',
    user_type: 'user',
    email: 'john@example.com',
    is_verified: true,
  };

  const mockBusinessProfile: BusinessProfile = {
    id: 100,
    name: 'Test Business',
    avatar_url: 'https://example.com/business100.jpg',
    user_type: 'business',
    description: 'A test business',
    is_online: true,
    business_hours: {
      open: '09:00',
      close: '17:00',
      timezone: 'UTC',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileCacheService,
        {
          provide: CACHE_SERVICE_TOKEN,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
            exists: jest.fn(),
          },
        },
        {
          provide: CacheAsideService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
            batchGet: jest.fn(),
            warmCache: jest.fn(),
          },
        },
        {
          provide: CacheKeyStrategyService,
          useValue: {
            generateUserProfileKey: jest.fn(),
            generateBusinessProfileKey: jest.fn(),
            generateStaleMarkerKey: jest.fn(),
          },
        },
        {
          provide: CacheMetricsService,
          useValue: {
            recordOperation: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProfileCacheService>(ProfileCacheService);
    mockCacheService = module.get(CACHE_SERVICE_TOKEN);
    mockCacheAside = module.get(CacheAsideService);
    mockKeyStrategy = module.get(CacheKeyStrategyService);
    mockMetricsService = module.get(CacheMetricsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserProfile', () => {
    it('should get user profile from cache', async () => {
      const userId = 1;
      const cacheKey = 'chat:v1:profile:user:1';
      const dataLoader = jest.fn().mockResolvedValue(mockUserProfile);

      mockKeyStrategy.generateUserProfileKey.mockReturnValue(cacheKey);
      mockCacheAside.get.mockResolvedValue({
        data: mockUserProfile,
        fromCache: true,
        isStale: false,
      });

      const result = await service.getUserProfile(userId, dataLoader);

      expect(result.profile).toEqual(mockUserProfile);
      expect(result.fromCache).toBe(true);
      expect(result.isStale).toBe(false);
      expect(mockKeyStrategy.generateUserProfileKey).toHaveBeenCalledWith(userId);
      expect(mockCacheAside.get).toHaveBeenCalledWith(
        cacheKey,
        dataLoader,
        expect.objectContaining({
          ttl: 24 * 60 * 60,
          staleMarkerTtl: 5 * 60,
          skipCache: false,
          staleWhileRevalidate: true,
        })
      );
      expect(mockMetricsService.recordOperation).toHaveBeenCalledWith(
        'getUserProfile',
        expect.any(Number),
        true
      );
    });

    it('should load user profile from data source on cache miss', async () => {
      const userId = 1;
      const cacheKey = 'chat:v1:profile:user:1';
      const dataLoader = jest.fn().mockResolvedValue(mockUserProfile);

      mockKeyStrategy.generateUserProfileKey.mockReturnValue(cacheKey);
      mockCacheAside.get.mockResolvedValue({
        data: mockUserProfile,
        fromCache: false,
        isStale: false,
      });

      const result = await service.getUserProfile(userId, dataLoader);

      expect(result.profile).toEqual(mockUserProfile);
      expect(result.fromCache).toBe(false);
      expect(result.isStale).toBe(false);
      expect(dataLoader).toHaveBeenCalled();
    });

    it('should handle errors and record metrics', async () => {
      const userId = 1;
      const error = new Error('Cache error');
      const dataLoader = jest.fn();

      mockKeyStrategy.generateUserProfileKey.mockReturnValue('test-key');
      mockCacheAside.get.mockRejectedValue(error);

      await expect(service.getUserProfile(userId, dataLoader)).rejects.toThrow(error);
      expect(mockMetricsService.recordOperation).toHaveBeenCalledWith(
        'getUserProfile',
        expect.any(Number),
        false
      );
    });
  });

  describe('getBusinessProfile', () => {
    it('should get business profile from cache', async () => {
      const businessId = 100;
      const cacheKey = 'chat:v1:profile:business:100';
      const dataLoader = jest.fn().mockResolvedValue(mockBusinessProfile);

      mockKeyStrategy.generateBusinessProfileKey.mockReturnValue(cacheKey);
      mockCacheAside.get.mockResolvedValue({
        data: mockBusinessProfile,
        fromCache: true,
        isStale: false,
      });

      const result = await service.getBusinessProfile(businessId, dataLoader);

      expect(result.profile).toEqual(mockBusinessProfile);
      expect(result.fromCache).toBe(true);
      expect(result.isStale).toBe(false);
      expect(mockKeyStrategy.generateBusinessProfileKey).toHaveBeenCalledWith(businessId);
    });
  });

  describe('getBatchProfiles', () => {
    it('should batch fetch profiles with cache optimization', async () => {
      const userIds = [1, 2];
      const businessIds = [100, 101];
      const userKeys = ['chat:v1:profile:user:1', 'chat:v1:profile:user:2'];
      const businessKeys = ['chat:v1:profile:business:100', 'chat:v1:profile:business:101'];

      const dataLoader = jest.fn().mockResolvedValue({
        users: new Map([[1, mockUserProfile]]),
        businesses: new Map([[100, mockBusinessProfile]]),
      });

      mockKeyStrategy.generateUserProfileKey
        .mockReturnValueOnce(userKeys[0])
        .mockReturnValueOnce(userKeys[1]);
      mockKeyStrategy.generateBusinessProfileKey
        .mockReturnValueOnce(businessKeys[0])
        .mockReturnValueOnce(businessKeys[1]);

      const mockCacheResults = new Map([
        [userKeys[0], { data: mockUserProfile, fromCache: true, isStale: false }],
        [businessKeys[0], { data: mockBusinessProfile, fromCache: true, isStale: false }],
      ]);

      mockCacheAside.batchGet.mockResolvedValue(mockCacheResults);

      const result = await service.getBatchProfiles(userIds, businessIds, dataLoader);

      expect(result.users.size).toBe(1);
      expect(result.businesses.size).toBe(1);
      expect(result.users.get(1)).toEqual(mockUserProfile);
      expect(result.businesses.get(100)).toEqual(mockBusinessProfile);
      expect(result.fromCache.users.has(1)).toBe(true);
      expect(result.fromCache.businesses.has(100)).toBe(true);
      expect(result.missing.users.has(2)).toBe(true);
      expect(result.missing.businesses.has(101)).toBe(true);
    });
  });

  describe('invalidateUserProfile', () => {
    it('should invalidate user profile cache', async () => {
      const userId = 1;
      const cacheKey = 'chat:v1:profile:user:1';

      mockKeyStrategy.generateUserProfileKey.mockReturnValue(cacheKey);
      mockCacheAside.delete.mockResolvedValue();

      await service.invalidateUserProfile(userId);

      expect(mockKeyStrategy.generateUserProfileKey).toHaveBeenCalledWith(userId);
      expect(mockCacheAside.delete).toHaveBeenCalledWith(cacheKey);
    });

    it('should handle invalidation errors gracefully', async () => {
      const userId = 1;
      const error = new Error('Delete error');

      mockKeyStrategy.generateUserProfileKey.mockReturnValue('test-key');
      mockCacheAside.delete.mockRejectedValue(error);

      // Should not throw
      await expect(service.invalidateUserProfile(userId)).resolves.toBeUndefined();
    });
  });

  describe('invalidateBusinessProfile', () => {
    it('should invalidate business profile cache', async () => {
      const businessId = 100;
      const cacheKey = 'chat:v1:profile:business:100';

      mockKeyStrategy.generateBusinessProfileKey.mockReturnValue(cacheKey);
      mockCacheAside.delete.mockResolvedValue();

      await service.invalidateBusinessProfile(businessId);

      expect(mockKeyStrategy.generateBusinessProfileKey).toHaveBeenCalledWith(businessId);
      expect(mockCacheAside.delete).toHaveBeenCalledWith(cacheKey);
    });
  });

  describe('invalidateBatchProfiles', () => {
    it('should invalidate multiple profiles', async () => {
      const userIds = [1, 2];
      const businessIds = [100, 101];

      mockKeyStrategy.generateUserProfileKey.mockReturnValue('user-key');
      mockKeyStrategy.generateBusinessProfileKey.mockReturnValue('business-key');
      mockCacheAside.delete.mockResolvedValue();

      await service.invalidateBatchProfiles(userIds, businessIds);

      expect(mockCacheAside.delete).toHaveBeenCalledTimes(4); // 2 users + 2 businesses
    });
  });

  describe('warmProfiles', () => {
    it('should warm cache with profile data', async () => {
      const users = new Map([[1, mockUserProfile]]);
      const businesses = new Map([[100, mockBusinessProfile]]);

      mockKeyStrategy.generateUserProfileKey.mockReturnValue('user-key');
      mockKeyStrategy.generateBusinessProfileKey.mockReturnValue('business-key');
      mockCacheAside.warmCache.mockResolvedValue();

      await service.warmProfiles(users, businesses);

      expect(mockCacheAside.warmCache).toHaveBeenCalledWith(
        expect.any(Map),
        expect.objectContaining({
          ttl: 24 * 60 * 60,
          staleMarkerTtl: 5 * 60,
        })
      );
    });
  });

  describe('isProfileCached', () => {
    it('should check if user profile is cached and not stale', async () => {
      const userId = 1;
      const cacheKey = 'chat:v1:profile:user:1';
      const staleMarkerKey = 'stale-marker-key';

      mockKeyStrategy.generateUserProfileKey.mockReturnValue(cacheKey);
      mockKeyStrategy.generateStaleMarkerKey.mockReturnValue(staleMarkerKey);
      mockCacheService.exists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      const result = await service.isProfileCached(userId);

      expect(result).toBe(true);
      expect(mockCacheService.exists).toHaveBeenCalledWith(cacheKey);
      expect(mockCacheService.exists).toHaveBeenCalledWith(staleMarkerKey);
    });

    it('should return false if profile is not cached', async () => {
      const userId = 1;
      const cacheKey = 'chat:v1:profile:user:1';

      mockKeyStrategy.generateUserProfileKey.mockReturnValue(cacheKey);
      mockCacheService.exists.mockResolvedValue(false);

      const result = await service.isProfileCached(userId);

      expect(result).toBe(false);
    });

    it('should return false if profile is stale', async () => {
      const userId = 1;
      const cacheKey = 'chat:v1:profile:user:1';
      const staleMarkerKey = 'stale-marker-key';

      mockKeyStrategy.generateUserProfileKey.mockReturnValue(cacheKey);
      mockKeyStrategy.generateStaleMarkerKey.mockReturnValue(staleMarkerKey);
      mockCacheService.exists.mockResolvedValueOnce(true).mockResolvedValueOnce(true);

      const result = await service.isProfileCached(userId);

      expect(result).toBe(false); // Stale profiles are considered not cached
    });
  });

  describe('setUserProfile', () => {
    it('should set user profile directly in cache', async () => {
      const userId = 1;
      const cacheKey = 'chat:v1:profile:user:1';

      mockKeyStrategy.generateUserProfileKey.mockReturnValue(cacheKey);
      mockCacheAside.set.mockResolvedValue();

      await service.setUserProfile(userId, mockUserProfile);

      expect(mockKeyStrategy.generateUserProfileKey).toHaveBeenCalledWith(userId);
      expect(mockCacheAside.set).toHaveBeenCalledWith(
        cacheKey,
        mockUserProfile,
        expect.objectContaining({ ttl: 24 * 60 * 60 })
      );
    });
  });

  describe('setBusinessProfile', () => {
    it('should set business profile directly in cache', async () => {
      const businessId = 100;
      const cacheKey = 'chat:v1:profile:business:100';

      mockKeyStrategy.generateBusinessProfileKey.mockReturnValue(cacheKey);
      mockCacheAside.set.mockResolvedValue();

      await service.setBusinessProfile(businessId, mockBusinessProfile);

      expect(mockKeyStrategy.generateBusinessProfileKey).toHaveBeenCalledWith(businessId);
      expect(mockCacheAside.set).toHaveBeenCalledWith(
        cacheKey,
        mockBusinessProfile,
        expect.objectContaining({ ttl: 24 * 60 * 60 })
      );
    });
  });

  describe('getProfileCacheStats', () => {
    it('should return cache statistics', async () => {
      const stats = await service.getProfileCacheStats();

      expect(stats).toHaveProperty('userProfiles');
      expect(stats).toHaveProperty('businessProfiles');
      expect(stats.userProfiles).toHaveProperty('cached');
      expect(stats.userProfiles).toHaveProperty('stale');
      expect(stats.businessProfiles).toHaveProperty('cached');
      expect(stats.businessProfiles).toHaveProperty('stale');
    });
  });
});