import { Injectable, Logger } from '@nestjs/common';
import { RedisCacheService } from './redis-cache.service';

@Injectable()
export class CacheHealthService {
  private readonly logger = new Logger(CacheHealthService.name);

  constructor(private readonly cacheService: RedisCacheService) {}

  async checkHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: {
      redis: boolean;
      latency?: number;
      error?: string;
    };
  }> {
    try {
      const startTime = Date.now();
      const isHealthy = await this.cacheService.isHealthy();
      const latency = Date.now() - startTime;

      if (isHealthy) {
        this.logger.log(`Redis health check passed (${latency}ms)`);
        return {
          status: 'healthy',
          details: {
            redis: true,
            latency,
          },
        };
      } else {
        this.logger.warn('Redis health check failed');
        return {
          status: 'unhealthy',
          details: {
            redis: false,
            error: 'Redis ping failed',
          },
        };
      }
    } catch (error) {
      this.logger.error('Redis health check error:', error);
      return {
        status: 'unhealthy',
        details: {
          redis: false,
          error: error.message,
        },
      };
    }
  }

  async testBasicOperations(): Promise<{
    success: boolean;
    operations: {
      set: boolean;
      get: boolean;
      delete: boolean;
    };
    error?: string;
  }> {
    const testKey = 'health:test:' + Date.now();
    const testValue = 'health-check-value';
    
    const operations = {
      set: false,
      get: false,
      delete: false,
    };

    try {
      // Test SET operation
      await this.cacheService.set(testKey, testValue, 60); // 1 minute TTL
      operations.set = true;
      this.logger.debug('Redis SET operation successful');

      // Test GET operation
      const retrievedValue = await this.cacheService.get<string>(testKey);
      if (retrievedValue === testValue) {
        operations.get = true;
        this.logger.debug('Redis GET operation successful');
      }

      // Test DELETE operation
      await this.cacheService.delete(testKey);
      const deletedValue = await this.cacheService.get<string>(testKey);
      if (deletedValue === null) {
        operations.delete = true;
        this.logger.debug('Redis DELETE operation successful');
      }

      const success = operations.set && operations.get && operations.delete;
      
      if (success) {
        this.logger.log('All Redis basic operations successful');
      } else {
        this.logger.warn('Some Redis operations failed', operations);
      }

      return { success, operations };
    } catch (error) {
      this.logger.error('Redis basic operations test failed:', error);
      return {
        success: false,
        operations,
        error: error.message,
      };
    }
  }
}