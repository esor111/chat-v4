import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@infrastructure/auth/decorators/public.decorator';

import { CacheHealthService } from '@infrastructure/cache/cache-health.service';
import { ProfileMockService } from '@infrastructure/profile/profile-mock.service';

@ApiTags('health')
@Controller('api/health')
export class HealthController {

  constructor(
    private readonly cacheHealthService: CacheHealthService,
    private readonly profileService: ProfileMockService,
  ) {}

  /**
   * Basic health check
   */
  @Public()
  @Get()
  async getHealth() {

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'chat-backend',
      version: '1.0.0',
    };
  }

  /**
   * Detailed health check with dependencies
   */
  @Public()
  @Get('detailed')
  async getDetailedHealth() {

    try {
      // Check Redis health
      const cacheHealth = await this.cacheHealthService.checkHealth();
      const cacheOperations = await this.cacheHealthService.testBasicOperations();

      // Check profile service
      const profileStats = this.profileService.getStats();

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'chat-backend',
        version: '1.0.0',
        dependencies: {
          redis: {
            status: cacheHealth.status,
            latency: cacheHealth.details.latency,
            operations: {
              set: cacheOperations.operations.set,
              get: cacheOperations.operations.get,
              delete: cacheOperations.operations.delete,
            },
          },
          profiles: {
            status: 'healthy',
            total_users: profileStats.totalUsers,
            total_businesses: profileStats.totalBusinesses,
            online_users: profileStats.onlineUsers,
            online_businesses: profileStats.onlineBusinesses,
          },
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'chat-backend',
        version: '1.0.0',
        error: error.message,
      };
    }
  }

  /**
   * Redis-specific health check
   */
  @Public()
  @Get('redis')
  async getRedisHealth() {

    try {
      const health = await this.cacheHealthService.checkHealth();
      const operations = await this.cacheHealthService.testBasicOperations();

      return {
        status: health.status,
        details: health.details,
        operations: operations.operations,
        success: operations.success,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }
}