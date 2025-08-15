import { UserProfile } from './user-profile.vo';

describe('UserProfile Value Object', () => {
  describe('create', () => {
    it('should create user profile with valid data', () => {
      const data = {
        userId: '123',
        name: 'John Doe',
        email: 'john@example.com',
        avatar: 'https://example.com/avatar.jpg',
        status: 'online',
      };

      const profile = UserProfile.create(data);

      expect(profile.userId).toBe('123');
      expect(profile.name).toBe('John Doe');
      expect(profile.email).toBe('john@example.com');
      expect(profile.avatar).toBe('https://example.com/avatar.jpg');
      expect(profile.status).toBe('online');
    });

    it('should trim whitespace from name', () => {
      const data = {
        userId: '123',
        name: '  John Doe  ',
      };

      const profile = UserProfile.create(data);
      expect(profile.name).toBe('John Doe');
    });

    it('should throw error for empty user ID', () => {
      expect(() => UserProfile.create({ userId: '', name: 'John' })).toThrow('User ID is required and cannot be empty');
      expect(() => UserProfile.create({ userId: '   ', name: 'John' })).toThrow('User ID is required and cannot be empty');
    });

    it('should throw error for empty name', () => {
      expect(() => UserProfile.create({ userId: '123', name: '' })).toThrow('User name is required');
      expect(() => UserProfile.create({ userId: '123', name: '   ' })).toThrow('User name is required');
    });

    it('should throw error for name too long', () => {
      const longName = 'a'.repeat(101);
      expect(() => UserProfile.create({ userId: '123', name: longName })).toThrow('User name cannot exceed 100 characters');
    });

    it('should throw error for invalid email', () => {
      expect(() => UserProfile.create({ userId: '123', name: 'John', email: 'invalid-email' })).toThrow('Invalid email format');
    });

    it('should throw error for invalid avatar URL', () => {
      expect(() => UserProfile.create({ userId: '123', name: 'John', avatar: 'invalid-url' })).toThrow('Invalid avatar URL format');
    });

    it('should throw error for invalid status', () => {
      expect(() => UserProfile.create({ userId: '123', name: 'John', status: 'invalid-status' })).toThrow('Invalid status value');
    });

    it('should accept valid status values', () => {
      const validStatuses = ['online', 'offline', 'away', 'busy'];
      validStatuses.forEach(status => {
        expect(() => UserProfile.create({ userId: '123', name: 'John', status })).not.toThrow();
      });
    });
  });

  describe('business methods', () => {
    const profile = UserProfile.create({
      userId: '123',
      name: 'John Doe',
      email: 'john@example.com',
      avatar: 'https://example.com/avatar.jpg',
      status: 'online',
    });

    it('should return display name', () => {
      expect(profile.getDisplayName()).toBe('John Doe');
    });

    it('should check if user is online', () => {
      expect(profile.isOnline()).toBe(true);
      
      const offlineProfile = UserProfile.create({
        userId: '123',
        name: 'John Doe',
        status: 'offline',
      });
      expect(offlineProfile.isOnline()).toBe(false);
    });

    it('should check if user has avatar', () => {
      expect(profile.hasAvatar()).toBe(true);
      
      const noAvatarProfile = UserProfile.create({
        userId: '123',
        name: 'John Doe',
      });
      expect(noAvatarProfile.hasAvatar()).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for identical profiles', () => {
      const data = {
        userId: '123',
        name: 'John Doe',
        email: 'john@example.com',
        avatar: 'https://example.com/avatar.jpg',
        status: 'online',
      };

      const profile1 = UserProfile.create(data);
      const profile2 = UserProfile.create(data);

      expect(profile1.equals(profile2)).toBe(true);
    });

    it('should return false for different profiles', () => {
      const profile1 = UserProfile.create({ userId: '123', name: 'John Doe' });
      const profile2 = UserProfile.create({ userId: '456', name: 'Jane Doe' });

      expect(profile1.equals(profile2)).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON correctly', () => {
      const data = {
        userId: '123',
        name: 'John Doe',
        email: 'john@example.com',
        avatar: 'https://example.com/avatar.jpg',
        status: 'online',
      };

      const profile = UserProfile.create(data);
      const json = profile.toJSON();

      expect(json).toEqual(data);
    });
  });
});