import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CACHE_SERVICE_TOKEN } from './cache.interface';
import { RedisCacheService } from './redis-cache.service';
import { CacheHealthService } from './cache-health.service';
import { CacheExampleService } from './cache-example.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    // Core cache service
    {
      provide: CACHE_SERVICE_TOKEN,
      useClass: RedisCacheService,
    },
    RedisCacheService,
    CacheHealthService,
    CacheExampleService,
  ],
  exports: [
    CACHE_SERVICE_TOKEN,
    RedisCacheService,
    CacheHealthService,
    CacheExampleService,
  ],
})
export class CacheModule {}