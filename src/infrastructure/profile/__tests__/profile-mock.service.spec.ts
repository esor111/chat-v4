import { Test, TestingModule } from '@nestjs/testing';
import { ProfileMockService, UserProfile, BusinessProfile } from '../profile-mock.service';

describe('ProfileMockService', () => {
  let service: ProfileMockService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProfileMockService],
    }).compile();

    service = module.get<ProfileMockService>(ProfileMockService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('user profiles', () => {
    it('should return a user profile by ID', async () => {
      const userId = 'afc70db3-6f43-4882-92fd-4715f25ffc95';
      const profile = await service.getUserProfile(userId);

      expect(profile).toBeDefined();
      expect(profile?.id).toBe(userId);
      expect(profile?.user_type).toBe('user');
      expect(profile?.name).toBeDefined();
    });

    it('should return null for non-existent user', async () => {
      const profile = await service.getUserProfile('999');
      expect(profile).toBeNull();
    });

    it('should return multiple user profiles', async () => {
      const userIds = ['afc70db3-6f43-4882-92fd-4715f25ffc95', 'c5c3d135-4968-450b-9fca-57f01e0055f7', '550e8400-e29b-41d4-a716-446655440003'];
      const profiles = await service.getUserProfiles(userIds);

      expect(profiles).toHaveLength(3);
      profiles.forEach((profile, index) => {
        expect(profile.id).toBe(userIds[index]);
        expect(profile.user_type).toBe('user');
      });
    });

    it('should handle partial results for user profiles', async () => {
      const userIds = ['afc70db3-6f43-4882-92fd-4715f25ffc95', '999', 'c5c3d135-4968-450b-9fca-57f01e0055f7']; // 999 doesn't exist
      const profiles = await service.getUserProfiles(userIds);

      expect(profiles).toHaveLength(2);
      expect(profiles.map(p => p.id)).toEqual(['afc70db3-6f43-4882-92fd-4715f25ffc95', 'c5c3d135-4968-450b-9fca-57f01e0055f7']);
    });

    it('should check if user exists', () => {
      expect(service.userExists('afc70db3-6f43-4882-92fd-4715f25ffc95')).toBe(true);
      expect(service.userExists('999')).toBe(false);
    });
  });

  describe('business profiles', () => {
    it('should return a business profile by ID', async () => {
      const businessId = '650e8400-e29b-41d4-a716-446655440100';
      const profile = await service.getBusinessProfile(businessId);

      expect(profile).toBeDefined();
      expect(profile?.id).toBe(businessId);
      expect(profile?.user_type).toBe('business');
      expect(profile?.name).toBeDefined();
      expect(profile?.is_online).toBeDefined();
      expect(profile?.business_hours).toBeDefined();
    });

    it('should return null for non-existent business', async () => {
      const profile = await service.getBusinessProfile('999');
      expect(profile).toBeNull();
    });

    it('should return multiple business profiles', async () => {
      const businessIds = ['650e8400-e29b-41d4-a716-446655440100', '650e8400-e29b-41d4-a716-446655440101'];
      const profiles = await service.getBusinessProfiles(businessIds);

      expect(profiles).toHaveLength(2);
      profiles.forEach((profile, index) => {
        expect(profile.id).toBe(businessIds[index]);
        expect(profile.user_type).toBe('business');
      });
    });

    it('should check if business exists', () => {
      expect(service.businessExists('650e8400-e29b-41d4-a716-446655440100')).toBe(true);
      expect(service.businessExists('999')).toBe(false);
    });
  });

  describe('batch operations', () => {
    it('should return batch profiles', async () => {
      const request = {
        user_ids: ['afc70db3-6f43-4882-92fd-4715f25ffc95', 'c5c3d135-4968-450b-9fca-57f01e0055f7'],
        business_ids: ['650e8400-e29b-41d4-a716-446655440100', '650e8400-e29b-41d4-a716-446655440101'],
      };

      const result = await service.getBatchProfiles(request);

      expect(result.users).toHaveLength(2);
      expect(result.businesses).toHaveLength(2);
      expect(result.users[0].user_type).toBe('user');
      expect(result.businesses[0].user_type).toBe('business');
    });

    it('should handle empty batch request', async () => {
      const result = await service.getBatchProfiles({});

      expect(result.users).toHaveLength(0);
      expect(result.businesses).toHaveLength(0);
    });

    it('should handle partial batch results', async () => {
      const request = {
        user_ids: ['afc70db3-6f43-4882-92fd-4715f25ffc95', '999'], // 999 doesn't exist
        business_ids: ['650e8400-e29b-41d4-a716-446655440100', '999'], // 999 doesn't exist
      };

      const result = await service.getBatchProfiles(request);

      expect(result.users).toHaveLength(1);
      expect(result.businesses).toHaveLength(1);
    });
  });

  describe('utility methods', () => {
    it('should return available user IDs', () => {
      const userIds = service.getAvailableUserIds();
      expect(userIds.length).toBeGreaterThan(0);
      expect(userIds).toEqual(expect.arrayContaining(['afc70db3-6f43-4882-92fd-4715f25ffc95', 'c5c3d135-4968-450b-9fca-57f01e0055f7', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440005']));
    });

    it('should return available business IDs', () => {
      const businessIds = service.getAvailableBusinessIds();
      expect(businessIds.length).toBeGreaterThan(0);
      expect(businessIds).toEqual(expect.arrayContaining(['650e8400-e29b-41d4-a716-446655440100', '650e8400-e29b-41d4-a716-446655440101', '650e8400-e29b-41d4-a716-446655440102', '650e8400-e29b-41d4-a716-446655440103']));
    });

    it('should return profile statistics', () => {
      const stats = service.getStats();
      expect(stats.totalUsers).toBeGreaterThan(0);
      expect(stats.totalBusinesses).toBeGreaterThan(0);
      expect(stats.onlineUsers).toBeGreaterThanOrEqual(0);
      expect(stats.onlineBusinesses).toBeGreaterThanOrEqual(0);
    });

    it('should add mock user profile', () => {
      const newUser: UserProfile = {
        id: '999',
        name: 'Test User',
        user_type: 'user',
        is_online: true,
      };

      service.addMockUser(newUser);
      expect(service.userExists('999')).toBe(true);
    });

    it('should add mock business profile', () => {
      const newBusiness: BusinessProfile = {
        id: '999',
        name: 'Test Business',
        user_type: 'business',
        is_online: true,
      };

      service.addMockBusiness(newBusiness);
      expect(service.businessExists('999')).toBe(true);
    });

    it('should clear mock data', () => {
      service.clearMockData();
      expect(service.getStats().totalUsers).toBe(0);
      expect(service.getStats().totalBusinesses).toBe(0);
    });
  });
});