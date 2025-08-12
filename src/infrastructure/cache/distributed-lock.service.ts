import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface LockOptions {
  ttl?: number; // Time to live in seconds
  retryDelay?: number; // Delay between retry attempts in ms
  retryCount?: number; // Maximum number of retry attempts
}

export interface LockInfo {
  key: string;
  value: string;
  ttl: number;
  acquiredAt: number;
}

@Injectable()
export class DistributedLockService {
  private readonly logger = new Logger(DistributedLockService.name);
  private redis: Redis;
  private readonly activeLocks = new Map<string, LockInfo>();

  // Lua script for atomic lock acquisition
  private readonly acquireLockScript = `
    if redis.call("GET", KEYS[1]) == ARGV[1] then
      return redis.call("PEXPIRE", KEYS[1], ARGV[2])
    else
      return redis.call("SET", KEYS[1], ARGV[1], "PX", ARGV[2], "NX")
    end
  `;

  // Lua script for atomic lock release
  private readonly releaseLockScript = `
    if redis.call("GET", KEYS[1]) == ARGV[1] then
      return redis.call("DEL", KEYS[1])
    else
      return 0
    end
  `;

  constructor(private readonly configService: ConfigService) {
    this.initializeRedis();
  }

  private initializeRedis(): void {
    const redisConfig = this.configService.get('redis');
    
    this.redis = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.on('error', (error) => {
      this.logger.error('Distributed lock Redis connection error:', error);
    });
  }

  /**
   * Acquire a distributed lock
   * @param key Lock key
   * @param ttlSeconds Time to live in seconds (default: 30)
   * @param options Additional lock options
   * @returns Promise<boolean> - true if lock acquired, false otherwise
   */
  async acquire(
    key: string, 
    ttlSeconds: number = 30, 
    options: LockOptions = {}
  ): Promise<boolean> {
    const lockKey = this.getLockKey(key);
    const lockValue = this.generateLockValue();
    const ttlMs = ttlSeconds * 1000;
    
    const {
      retryDelay = 100,
      retryCount = 0,
    } = options;

    let attempts = 0;
    const maxAttempts = retryCount + 1;

    while (attempts < maxAttempts) {
      try {
        const result = await this.redis.eval(
          this.acquireLockScript,
          1,
          lockKey,
          lockValue,
          ttlMs.toString()
        ) as string | number;

        if (result === 'OK' || result === 1) {
          const lockInfo: LockInfo = {
            key: lockKey,
            value: lockValue,
            ttl: ttlSeconds,
            acquiredAt: Date.now(),
          };
          
          this.activeLocks.set(lockKey, lockInfo);
          this.logger.debug(`Lock acquired: ${lockKey}`);
          
          // Set up automatic cleanup
          this.scheduleCleanup(lockKey, ttlSeconds);
          
          return true;
        }

        attempts++;
        if (attempts < maxAttempts) {
          await this.sleep(retryDelay);
        }
      } catch (error) {
        this.logger.error(`Error acquiring lock ${lockKey}:`, error);
        attempts++;
        if (attempts < maxAttempts) {
          await this.sleep(retryDelay);
        }
      }
    }

    this.logger.debug(`Failed to acquire lock: ${lockKey} after ${attempts} attempts`);
    return false;
  }

  /**
   * Release a distributed lock
   * @param key Lock key
   * @returns Promise<boolean> - true if lock released, false if lock not owned
   */
  async release(key: string): Promise<boolean> {
    const lockKey = this.getLockKey(key);
    const lockInfo = this.activeLocks.get(lockKey);
    
    if (!lockInfo) {
      this.logger.warn(`Attempting to release non-existent lock: ${lockKey}`);
      return false;
    }

    try {
      const result = await this.redis.eval(
        this.releaseLockScript,
        1,
        lockKey,
        lockInfo.value
      ) as number;

      if (result === 1) {
        this.activeLocks.delete(lockKey);
        this.logger.debug(`Lock released: ${lockKey}`);
        return true;
      } else {
        this.logger.warn(`Failed to release lock (not owned): ${lockKey}`);
        this.activeLocks.delete(lockKey); // Clean up local state
        return false;
      }
    } catch (error) {
      this.logger.error(`Error releasing lock ${lockKey}:`, error);
      return false;
    }
  }

  /**
   * Extend the TTL of an existing lock
   * @param key Lock key
   * @param ttlSeconds New TTL in seconds
   * @returns Promise<boolean> - true if extended, false if lock not owned
   */
  async extend(key: string, ttlSeconds: number): Promise<boolean> {
    const lockKey = this.getLockKey(key);
    const lockInfo = this.activeLocks.get(lockKey);
    
    if (!lockInfo) {
      return false;
    }

    try {
      const result = await this.redis.eval(
        this.acquireLockScript,
        1,
        lockKey,
        lockInfo.value,
        (ttlSeconds * 1000).toString()
      ) as number;

      if (result === 1) {
        lockInfo.ttl = ttlSeconds;
        this.scheduleCleanup(lockKey, ttlSeconds);
        this.logger.debug(`Lock extended: ${lockKey} for ${ttlSeconds}s`);
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.error(`Error extending lock ${lockKey}:`, error);
      return false;
    }
  }

  /**
   * Check if a lock exists and is owned by this instance
   * @param key Lock key
   * @returns boolean
   */
  isLocked(key: string): boolean {
    const lockKey = this.getLockKey(key);
    return this.activeLocks.has(lockKey);
  }

  /**
   * Get information about an active lock
   * @param key Lock key
   * @returns LockInfo | null
   */
  getLockInfo(key: string): LockInfo | null {
    const lockKey = this.getLockKey(key);
    return this.activeLocks.get(lockKey) || null;
  }

  /**
   * Execute a function with a distributed lock
   * @param key Lock key
   * @param fn Function to execute
   * @param ttlSeconds Lock TTL in seconds
   * @param options Lock options
   * @returns Promise<T> - Result of the function execution
   */
  async withLock<T>(
    key: string,
    fn: () => Promise<T>,
    ttlSeconds: number = 30,
    options: LockOptions = {}
  ): Promise<T> {
    const acquired = await this.acquire(key, ttlSeconds, options);
    
    if (!acquired) {
      throw new Error(`Failed to acquire lock: ${key}`);
    }

    try {
      return await fn();
    } finally {
      await this.release(key);
    }
  }

  /**
   * Get all active locks managed by this instance
   * @returns LockInfo[]
   */
  getActiveLocks(): LockInfo[] {
    return Array.from(this.activeLocks.values());
  }

  /**
   * Release all active locks (cleanup on shutdown)
   * @returns Promise<void>
   */
  async releaseAllLocks(): Promise<void> {
    const lockKeys = Array.from(this.activeLocks.keys());
    const releasePromises = lockKeys.map(lockKey => {
      const key = lockKey.replace('lock:', '');
      return this.release(key);
    });

    await Promise.allSettled(releasePromises);
    this.logger.log(`Released ${lockKeys.length} active locks`);
  }

  private getLockKey(key: string): string {
    return `lock:${key}`;
  }

  private generateLockValue(): string {
    // Generate a unique value for this lock instance
    return `${process.pid}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private scheduleCleanup(lockKey: string, ttlSeconds: number): void {
    // Schedule cleanup slightly after TTL to handle clock drift
    const cleanupDelay = (ttlSeconds + 1) * 1000;
    
    setTimeout(() => {
      if (this.activeLocks.has(lockKey)) {
        this.activeLocks.delete(lockKey);
        this.logger.debug(`Cleaned up expired lock: ${lockKey}`);
      }
    }, cleanupDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async onModuleDestroy(): Promise<void> {
    await this.releaseAllLocks();
    if (this.redis) {
      await this.redis.quit();
    }
  }
}