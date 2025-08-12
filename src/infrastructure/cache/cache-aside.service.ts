import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ICacheService, CACHE_SERVICE_TOKEN } from './cache.interface';
import { CacheKeyStrategyService } from './cache-key-strategy.service';
import { DistributedLockService } from './distributed-lock.service';

export interface CacheAsideOptions {
  ttl?: number;
  staleWhileRevalidate?: boolean;
  staleMarkerTtl?: number;
  lockTimeout?: number;
  skipCache?: boolean;
}

export interface CacheResult<T> {
  data: T;
  fromCache: boolean;
  isStale: boolean;
}

@Injectable()
export class CacheAsideService {
  private readonly logger = new Logger(CacheAsideService.name);

  constructor(
    @Inject(CACHE_SERVICE_TOKEN) private readonly cacheService: ICacheService,
    private readonly keyStrategy: CacheKeyStrategyService,
    private readonly distributedLock: DistributedLockService,
  ) {}

  /**
   * Get data with Cache-Aside pattern
   * @param key Cache key
   * @param dataLoader Function to load data from source
   * @param options Cache options
   * @returns Promise<CacheResult<T>>
   */
  async get<T>(
    key: string,
    dataLoader: () => Promise<T>,
    options: CacheAsideOptions = {}
  ): Promise<CacheResult<T>> {
    const {
      ttl = 3600, // 1 hour default
      staleWhileRevalidate = true,
      staleMarkerTtl = 300, // 5 minutes
      lockTimeout = 30,
      skipCache = false,
    } = options;

    // Skip cache if requested
    if (skipCache) {
      const data = await dataLoader();
      return { data, fromCache: false, isStale: false };
    }

    try {
      // Try to get from cache first
      const cachedData = await this.cacheService.get<T>(key);
      
      if (cachedData !== null) {
        // Check if data is stale
        const staleMarkerKey = this.keyStrategy.generateStaleMarkerKey('data', key);
        const isStale = await this.cacheService.exists(staleMarkerKey);
        
        if (isStale && staleWhileRevalidate) {
          // Start background refresh without waiting
          this.refreshInBackground(key, dataLoader, ttl, staleMarkerTtl, lockTimeout);
          return { data: cachedData, fromCache: true, isStale: true };
        }
        
        return { data: cachedData, fromCache: true, isStale: false };
      }

      // Cache miss - load data and cache it
      const data = await this.loadAndCache(key, dataLoader, ttl, staleMarkerTtl, lockTimeout);
      return { data, fromCache: false, isStale: false };
      
    } catch (error) {
      this.logger.error(`Cache-aside get error for key ${key}:`, error);
      // Fallback to direct data loading
      const data = await dataLoader();
      return { data, fromCache: false, isStale: false };
    }
  }

  /**
   * Set data in cache with stale-while-revalidate support
   * @param key Cache key
   * @param data Data to cache
   * @param options Cache options
   */
  async set<T>(key: string, data: T, options: CacheAsideOptions = {}): Promise<void> {
    const { ttl = 3600, staleMarkerTtl = 300 } = options;

    try {
      await this.cacheService.set(key, data, ttl);
      
      // Set stale marker with shorter TTL for stale-while-revalidate
      if (staleMarkerTtl > 0) {
        const staleMarkerKey = this.keyStrategy.generateStaleMarkerKey('data', key);
        await this.cacheService.set(staleMarkerKey, '1', ttl - staleMarkerTtl);
      }
    } catch (error) {
      this.logger.error(`Cache-aside set error for key ${key}:`, error);
      // Don't throw - caching is not critical
    }
  }

  /**
   * Delete data from cache
   * @param key Cache key
   */
  async delete(key: string): Promise<void> {
    try {
      await this.cacheService.delete(key);
      
      // Also delete stale marker
      const staleMarkerKey = this.keyStrategy.generateStaleMarkerKey('data', key);
      await this.cacheService.delete(staleMarkerKey);
    } catch (error) {
      this.logger.error(`Cache-aside delete error for key ${key}:`, error);
    }
  }

  /**
   * Batch get with Cache-Aside pattern
   * @param keys Array of cache keys
   * @param dataLoader Function to load data for missing keys
   * @param options Cache options
   * @returns Promise<Map<string, CacheResult<T>>>
   */
  async batchGet<T>(
    keys: string[],
    dataLoader: (missingKeys: string[]) => Promise<Map<string, T>>,
    options: CacheAsideOptions = {}
  ): Promise<Map<string, CacheResult<T>>> {
    const results = new Map<string, CacheResult<T>>();
    const missingKeys: string[] = [];
    const staleKeys: string[] = [];

    const { staleWhileRevalidate = true } = options;

    // Check cache for all keys
    for (const key of keys) {
      try {
        const cachedData = await this.cacheService.get<T>(key);
        
        if (cachedData !== null) {
          const staleMarkerKey = this.keyStrategy.generateStaleMarkerKey('data', key);
          const isStale = await this.cacheService.exists(staleMarkerKey);
          
          results.set(key, { data: cachedData, fromCache: true, isStale });
          
          if (isStale && staleWhileRevalidate) {
            staleKeys.push(key);
          }
        } else {
          missingKeys.push(key);
        }
      } catch (error) {
        this.logger.error(`Batch cache check error for key ${key}:`, error);
        missingKeys.push(key);
      }
    }

    // Load missing data
    if (missingKeys.length > 0) {
      try {
        const loadedData = await dataLoader(missingKeys);
        
        for (const [key, data] of loadedData.entries()) {
          results.set(key, { data, fromCache: false, isStale: false });
          // Cache the loaded data
          await this.set(key, data, options);
        }
      } catch (error) {
        this.logger.error('Batch data loading error:', error);
      }
    }

    // Refresh stale data in background
    if (staleKeys.length > 0) {
      this.batchRefreshInBackground(staleKeys, dataLoader, options);
    }

    return results;
  }

  /**
   * Warm cache with data
   * @param warmingData Map of key-value pairs to warm
   * @param options Cache options
   */
  async warmCache<T>(warmingData: Map<string, T>, options: CacheAsideOptions = {}): Promise<void> {
    const lockKey = 'cache-warming';
    const acquired = await this.distributedLock.acquire(lockKey, 300); // 5 minutes
    
    if (!acquired) {
      this.logger.warn('Cache warming already in progress, skipping');
      return;
    }

    try {
      this.logger.log(`Starting cache warming for ${warmingData.size} items`);
      
      const promises = Array.from(warmingData.entries()).map(([key, data]) =>
        this.set(key, data, options).catch(error => 
          this.logger.error(`Cache warming error for key ${key}:`, error)
        )
      );

      await Promise.allSettled(promises);
      this.logger.log(`Cache warming completed for ${warmingData.size} items`);
    } finally {
      await this.distributedLock.release(lockKey);
    }
  }

  /**
   * Invalidate cache pattern
   * @param pattern Cache key pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      await this.cacheService.deletePattern(pattern);
      
      // Also invalidate stale markers
      const stalePattern = this.keyStrategy.generateStaleMarkerPattern();
      await this.cacheService.deletePattern(stalePattern);
    } catch (error) {
      this.logger.error(`Cache pattern invalidation error for pattern ${pattern}:`, error);
    }
  }

  private async loadAndCache<T>(
    key: string,
    dataLoader: () => Promise<T>,
    ttl: number,
    staleMarkerTtl: number,
    lockTimeout: number
  ): Promise<T> {
    const lockKey = `load:${key}`;
    
    // Use distributed lock to prevent cache stampede
    const acquired = await this.distributedLock.acquire(lockKey, lockTimeout);
    
    if (!acquired) {
      // If we can't acquire lock, wait a bit and try cache again
      await this.sleep(100);
      const cachedData = await this.cacheService.get<T>(key);
      if (cachedData !== null) {
        return cachedData;
      }
      // If still no data, load without lock (fallback)
    }

    try {
      // Double-check cache after acquiring lock
      if (acquired) {
        const cachedData = await this.cacheService.get<T>(key);
        if (cachedData !== null) {
          return cachedData;
        }
      }

      // Load data from source
      const data = await dataLoader();
      
      // Cache the data
      await this.set(key, data, { ttl, staleMarkerTtl });
      
      return data;
    } finally {
      if (acquired) {
        await this.distributedLock.release(lockKey);
      }
    }
  }

  private async refreshInBackground<T>(
    key: string,
    dataLoader: () => Promise<T>,
    ttl: number,
    staleMarkerTtl: number,
    lockTimeout: number
  ): Promise<void> {
    // Don't await - this runs in background
    setImmediate(async () => {
      try {
        await this.loadAndCache(key, dataLoader, ttl, staleMarkerTtl, lockTimeout);
        this.logger.debug(`Background refresh completed for key: ${key}`);
      } catch (error) {
        this.logger.error(`Background refresh error for key ${key}:`, error);
      }
    });
  }

  private async batchRefreshInBackground<T>(
    keys: string[],
    dataLoader: (keys: string[]) => Promise<Map<string, T>>,
    options: CacheAsideOptions
  ): Promise<void> {
    // Don't await - this runs in background
    setImmediate(async () => {
      try {
        const refreshedData = await dataLoader(keys);
        
        const promises = Array.from(refreshedData.entries()).map(([key, data]) =>
          this.set(key, data, options)
        );

        await Promise.allSettled(promises);
        this.logger.debug(`Background batch refresh completed for ${keys.length} keys`);
      } catch (error) {
        this.logger.error('Background batch refresh error:', error);
      }
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}