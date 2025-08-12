import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ICacheService, CacheMetrics } from './cache.interface';

@Injectable()
export class RedisCacheService implements ICacheService, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private redis: Redis;
  private readonly metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    totalOperations: 0,
    hitRate: 0,
  };

  constructor(private readonly configService: ConfigService) {
    this.initializeRedis();
  }

  private initializeRedis(): void {
    // Simple Redis connection configuration
    const host = this.configService.get('REDIS_HOST', 'localhost');
    const port = this.configService.get('REDIS_PORT', 6379);
    const password = this.configService.get('REDIS_PASSWORD');
    
    this.redis = new Redis({
      host,
      port,
      password,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      this.logger.log('Redis connected successfully');
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
      this.metrics.errors++;
    });

    this.redis.on('close', () => {
      this.logger.warn('Redis connection closed');
    });

    this.redis.on('reconnecting', () => {
      this.logger.log('Redis reconnecting...');
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      this.updateMetrics(value !== null ? 'hit' : 'miss');
      
      if (value === null) {
        return null;
      }

      try {
        return JSON.parse(value) as T;
      } catch {
        // Return as string if not JSON
        return value as unknown as T;
      }
    } catch (error) {
      this.logger.error(`Redis GET error for key ${key}:`, error);
      this.metrics.errors++;
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, serializedValue);
      } else {
        await this.redis.set(key, serializedValue);
      }
      
      this.updateMetrics('set');
    } catch (error) {
      this.logger.error(`Redis SET error for key ${key}:`, error);
      this.metrics.errors++;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      this.updateMetrics('delete');
    } catch (error) {
      this.logger.error(`Redis DELETE error for key ${key}:`, error);
      this.metrics.errors++;
      throw error;
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.updateMetrics('delete', keys.length);
      }
    } catch (error) {
      this.logger.error(`Redis DELETE PATTERN error for pattern ${pattern}:`, error);
      this.metrics.errors++;
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Redis EXISTS error for key ${key}:`, error);
      this.metrics.errors++;
      return false;
    }
  }

  async increment(key: string, value: number = 1): Promise<number> {
    try {
      return await this.redis.incrby(key, value);
    } catch (error) {
      this.logger.error(`Redis INCREMENT error for key ${key}:`, error);
      this.metrics.errors++;
      throw error;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.expire(key, ttlSeconds);
    } catch (error) {
      this.logger.error(`Redis EXPIRE error for key ${key}:`, error);
      this.metrics.errors++;
      throw error;
    }
  }

  // Hash operations
  async hget<T>(key: string, field: string): Promise<T | null> {
    try {
      const value = await this.redis.hget(key, field);
      this.updateMetrics(value !== null ? 'hit' : 'miss');
      
      if (value === null) {
        return null;
      }

      try {
        return JSON.parse(value) as T;
      } catch {
        return value as unknown as T;
      }
    } catch (error) {
      this.logger.error(`Redis HGET error for key ${key}, field ${field}:`, error);
      this.metrics.errors++;
      return null;
    }
  }

  async hset<T>(key: string, field: string, value: T): Promise<void> {
    try {
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      await this.redis.hset(key, field, serializedValue);
      this.updateMetrics('set');
    } catch (error) {
      this.logger.error(`Redis HSET error for key ${key}, field ${field}:`, error);
      this.metrics.errors++;
      throw error;
    }
  }

  async hdel(key: string, field: string): Promise<void> {
    try {
      await this.redis.hdel(key, field);
      this.updateMetrics('delete');
    } catch (error) {
      this.logger.error(`Redis HDEL error for key ${key}, field ${field}:`, error);
      this.metrics.errors++;
      throw error;
    }
  }

  async hgetall<T>(key: string): Promise<Record<string, T>> {
    try {
      const result = await this.redis.hgetall(key);
      const parsed: Record<string, T> = {};
      
      for (const [field, value] of Object.entries(result)) {
        try {
          parsed[field] = JSON.parse(value) as T;
        } catch {
          parsed[field] = value as unknown as T;
        }
      }
      
      this.updateMetrics('hit');
      return parsed;
    } catch (error) {
      this.logger.error(`Redis HGETALL error for key ${key}:`, error);
      this.metrics.errors++;
      return {};
    }
  }

  // List operations
  async lpush<T>(key: string, ...values: T[]): Promise<number> {
    try {
      const serializedValues = values.map(v => 
        typeof v === 'string' ? v : JSON.stringify(v)
      );
      return await this.redis.lpush(key, ...serializedValues);
    } catch (error) {
      this.logger.error(`Redis LPUSH error for key ${key}:`, error);
      this.metrics.errors++;
      throw error;
    }
  }

  async rpush<T>(key: string, ...values: T[]): Promise<number> {
    try {
      const serializedValues = values.map(v => 
        typeof v === 'string' ? v : JSON.stringify(v)
      );
      return await this.redis.rpush(key, ...serializedValues);
    } catch (error) {
      this.logger.error(`Redis RPUSH error for key ${key}:`, error);
      this.metrics.errors++;
      throw error;
    }
  }

  async lpop<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.lpop(key);
      if (value === null) return null;
      
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as unknown as T;
      }
    } catch (error) {
      this.logger.error(`Redis LPOP error for key ${key}:`, error);
      this.metrics.errors++;
      return null;
    }
  }

  async rpop<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.rpop(key);
      if (value === null) return null;
      
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as unknown as T;
      }
    } catch (error) {
      this.logger.error(`Redis RPOP error for key ${key}:`, error);
      this.metrics.errors++;
      return null;
    }
  }

  async lrange<T>(key: string, start: number, stop: number): Promise<T[]> {
    try {
      const values = await this.redis.lrange(key, start, stop);
      return values.map(value => {
        try {
          return JSON.parse(value) as T;
        } catch {
          return value as unknown as T;
        }
      });
    } catch (error) {
      this.logger.error(`Redis LRANGE error for key ${key}:`, error);
      this.metrics.errors++;
      return [];
    }
  }

  // Set operations
  async sadd<T>(key: string, ...members: T[]): Promise<number> {
    try {
      const serializedMembers = members.map(m => 
        typeof m === 'string' ? m : JSON.stringify(m)
      );
      return await this.redis.sadd(key, ...serializedMembers);
    } catch (error) {
      this.logger.error(`Redis SADD error for key ${key}:`, error);
      this.metrics.errors++;
      throw error;
    }
  }

  async srem<T>(key: string, ...members: T[]): Promise<number> {
    try {
      const serializedMembers = members.map(m => 
        typeof m === 'string' ? m : JSON.stringify(m)
      );
      return await this.redis.srem(key, ...serializedMembers);
    } catch (error) {
      this.logger.error(`Redis SREM error for key ${key}:`, error);
      this.metrics.errors++;
      throw error;
    }
  }

  async smembers<T>(key: string): Promise<T[]> {
    try {
      const members = await this.redis.smembers(key);
      return members.map(member => {
        try {
          return JSON.parse(member) as T;
        } catch {
          return member as unknown as T;
        }
      });
    } catch (error) {
      this.logger.error(`Redis SMEMBERS error for key ${key}:`, error);
      this.metrics.errors++;
      return [];
    }
  }

  async sismember<T>(key: string, member: T): Promise<boolean> {
    try {
      const serializedMember = typeof member === 'string' ? member : JSON.stringify(member);
      const result = await this.redis.sismember(key, serializedMember);
      return result === 1;
    } catch (error) {
      this.logger.error(`Redis SISMEMBER error for key ${key}:`, error);
      this.metrics.errors++;
      return false;
    }
  }

  // Health check method
  async isHealthy(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      return false;
    }
  }

  // Metrics and monitoring
  getMetrics(): CacheMetrics {
    const total = this.metrics.hits + this.metrics.misses;
    return {
      ...this.metrics,
      totalOperations: total,
      hitRate: total > 0 ? this.metrics.hits / total : 0,
    };
  }

  resetMetrics(): void {
    Object.keys(this.metrics).forEach(key => {
      (this.metrics as any)[key] = 0;
    });
  }

  private updateMetrics(operation: 'hit' | 'miss' | 'set' | 'delete', count: number = 1): void {
    this.metrics[operation === 'hit' ? 'hits' : 
                  operation === 'miss' ? 'misses' :
                  operation === 'set' ? 'sets' : 'deletes'] += count;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.logger.log('Redis connection closed');
    }
  }
}