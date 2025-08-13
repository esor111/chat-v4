import { Injectable } from '@nestjs/common';
import { IUserQueryRepository } from '@domain/repositories/user.repository.interface';
import { User } from '@domain/entities/user.entity';
import { StructuredLoggerService } from '@infrastructure/logging/structured-logger.service';

// Simple in-memory cache for demonstration
// In production, you would use Redis or another caching solution
class SimpleCache {
  private cache = new Map<string, { data: any; expiry: number }>();

  set(key: string, value: any, ttlSeconds: number = 300): void {
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { data: value, expiry });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

@Injectable()
export class CachedUserQueryRepository implements IUserQueryRepository {
  private cache = new SimpleCache();
  private readonly defaultTtl = 300; // 5 minutes

  constructor(
    private readonly baseRepository: IUserQueryRepository,
    private readonly logger: StructuredLoggerService,
  ) {}

  async findById(userId: string): Promise<User | null> {
    const cacheKey = `user:${userId}`;
    
    // Try cache first
    const cached = this.cache.get(cacheKey);
    if (cached !== null) {
      this.logger.debug('Cache hit for user lookup', {
        service: 'CachedUserQueryRepository',
        operation: 'findById',
        userId,
        cacheKey,
      });
      return cached;
    }

    // Cache miss - fetch from database
    this.logger.debug('Cache miss for user lookup', {
      service: 'CachedUserQueryRepository',
      operation: 'findById',
      userId,
      cacheKey,
    });

    const user = await this.baseRepository.findById(userId);
    
    // Cache the result (including null results to prevent repeated queries)
    this.cache.set(cacheKey, user, this.defaultTtl);
    
    return user;
  }

  async findByIds(userIds: string[]): Promise<User[]> {
    const cacheKey = `users:${userIds.sort().join(',')}`;
    
    // Try cache first
    const cached = this.cache.get(cacheKey);
    if (cached !== null) {
      this.logger.debug('Cache hit for users lookup', {
        service: 'CachedUserQueryRepository',
        operation: 'findByIds',
        userIds,
        cacheKey,
      });
      return cached;
    }

    // Cache miss - fetch from database
    this.logger.debug('Cache miss for users lookup', {
      service: 'CachedUserQueryRepository',
      operation: 'findByIds',
      userIds,
      cacheKey,
    });

    const users = await this.baseRepository.findByIds(userIds);
    
    // Cache the result
    this.cache.set(cacheKey, users, this.defaultTtl);
    
    // Also cache individual users
    users.forEach(user => {
      this.cache.set(`user:${user.userId}`, user, this.defaultTtl);
    });
    
    return users;
  }

  async exists(userId: string): Promise<boolean> {
    const cacheKey = `user:exists:${userId}`;
    
    // Try cache first
    const cached = this.cache.get(cacheKey);
    if (cached !== null) {
      this.logger.debug('Cache hit for user existence check', {
        service: 'CachedUserQueryRepository',
        operation: 'exists',
        userId,
        cacheKey,
      });
      return cached;
    }

    // Cache miss - check database
    const exists = await this.baseRepository.exists(userId);
    
    // Cache the result with shorter TTL for existence checks
    this.cache.set(cacheKey, exists, 60); // 1 minute
    
    return exists;
  }

  async findActiveUsers(userIds: string[]): Promise<User[]> {
    // For active users, we don't cache as the status might change frequently
    return await this.baseRepository.findActiveUsers(userIds);
  }

  // Cache invalidation methods
  invalidateUser(userId: string): void {
    this.cache.delete(`user:${userId}`);
    this.cache.delete(`user:exists:${userId}`);
    
    this.logger.debug('Cache invalidated for user', {
      service: 'CachedUserQueryRepository',
      operation: 'invalidateUser',
      userId,
    });
  }

  clearCache(): void {
    this.cache.clear();
    
    this.logger.debug('All cache cleared', {
      service: 'CachedUserQueryRepository',
      operation: 'clearCache',
    });
  }
}