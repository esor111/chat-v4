# Cache Infrastructure

This directory contains a comprehensive, scalable caching infrastructure implementation with enterprise-grade design patterns for the chat microservice system.

## Overview

The cache infrastructure provides:

- **Redis-based caching** with cluster support and failover
- **Circuit Breaker pattern** for graceful degradation
- **Distributed locking** to prevent cache stampede scenarios
- **Cache-Aside pattern** with stale-while-revalidate support
- **Comprehensive metrics and monitoring**
- **Proper key namespacing and versioning**

## Architecture

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Application       │    │   Cache Layer       │    │   Redis Cluster     │
│   Services          │───▶│                     │───▶│                     │
│                     │    │  - Cache-Aside      │    │  - Primary/Replica  │
│  - Profile Service  │    │  - Circuit Breaker  │    │  - Sharding         │
│  - Message Service  │    │  - Distributed Lock │    │  - Failover         │
│  - Presence Service │    │  - Key Strategy     │    │                     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

## Core Components

### 1. RedisCacheService

- **File**: `redis-cache.service.ts`
- **Purpose**: Core Redis operations with circuit breaker integration
- **Features**:
  - Basic operations (get, set, delete, exists)
  - Hash operations (hget, hset, hgetall)
  - List operations (lpush, rpush, lpop, rpop, lrange)
  - Set operations (sadd, srem, smembers, sismember)
  - Automatic JSON serialization/deserialization
  - Connection pooling and cluster support
  - Comprehensive error handling

### 2. CircuitBreakerService

- **File**: `circuit-breaker.service.ts`
- **Purpose**: Implements circuit breaker pattern for Redis failures
- **States**: CLOSED → OPEN → HALF_OPEN → CLOSED
- **Features**:
  - Configurable failure thresholds
  - Automatic recovery attempts
  - Metrics collection
  - Manual control for testing

### 3. DistributedLockService

- **File**: `distributed-lock.service.ts`
- **Purpose**: Prevents cache stampede and ensures atomic operations
- **Features**:
  - Lua script-based atomic operations
  - Lock acquisition with retry logic
  - Automatic lock expiration
  - Lock extension support
  - Bulk lock management

### 4. CacheAsideService

- **File**: `cache-aside.service.ts`
- **Purpose**: Implements Cache-Aside pattern with advanced features
- **Features**:
  - Stale-while-revalidate pattern
  - Background cache refresh
  - Batch operations
  - Cache warming
  - Pattern-based invalidation

### 5. CacheKeyStrategyService

- **File**: `cache-key-strategy.service.ts`
- **Purpose**: Consistent key generation and management
- **Features**:
  - Namespaced key generation
  - Version support for migrations
  - Predefined key generators
  - Pattern generators for bulk operations
  - Key validation and parsing

### 6. CacheMetricsService

- **File**: `cache-metrics.service.ts`
- **Purpose**: Comprehensive metrics collection and monitoring
- **Features**:
  - Performance metrics (latency, throughput)
  - Hit rate tracking
  - Error rate monitoring
  - Prometheus metrics export
  - Scheduled metrics logging

## Usage Examples

### Basic Cache Operations

```typescript
import { Inject } from "@nestjs/common";
import { ICacheService, CACHE_SERVICE_TOKEN } from "./cache.interface";

@Injectable()
export class MyService {
  constructor(
    @Inject(CACHE_SERVICE_TOKEN) private readonly cache: ICacheService
  ) {}

  async getUser(id: number) {
    const key = `user:${id}`;
    let user = await this.cache.get(key);

    if (!user) {
      user = await this.loadUserFromDatabase(id);
      await this.cache.set(key, user, 3600); // 1 hour TTL
    }

    return user;
  }
}
```

### Cache-Aside Pattern with Stale-While-Revalidate

```typescript
import { CacheAsideService } from "./cache-aside.service";

@Injectable()
export class ProfileService {
  constructor(private readonly cacheAside: CacheAsideService) {}

  async getUserProfile(userId: number) {
    const result = await this.cacheAside.get(
      `profile:user:${userId}`,
      () => this.loadProfileFromAPI(userId),
      {
        ttl: 24 * 60 * 60, // 24 hours
        staleWhileRevalidate: true,
        staleMarkerTtl: 5 * 60, // 5 minutes
      }
    );

    return result.data;
  }
}
```

### Distributed Locking

```typescript
import { DistributedLockService } from "./distributed-lock.service";

@Injectable()
export class CriticalOperationService {
  constructor(private readonly lock: DistributedLockService) {}

  async performCriticalOperation(resourceId: string) {
    return await this.lock.withLock(
      `critical:${resourceId}`,
      async () => {
        // Critical operation here
        return await this.doSomethingCritical(resourceId);
      },
      30, // 30 seconds timeout
      { retryCount: 3, retryDelay: 100 }
    );
  }
}
```

### Batch Operations

```typescript
async getBatchProfiles(userIds: number[]) {
  const keys = userIds.map(id => `profile:user:${id}`);

  const results = await this.cacheAside.batchGet(
    keys,
    async (missingKeys) => {
      const missingIds = missingKeys.map(key =>
        parseInt(key.split(':')[2])
      );
      return await this.loadProfilesFromAPI(missingIds);
    }
  );

  return results;
}
```

## Configuration

### Environment Variables

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_CLUSTER_ENABLED=false
REDIS_CLUSTER_NODES=host1:6379,host2:6379,host3:6379

# Circuit Breaker
CACHE_CB_FAILURE_THRESHOLD=5
CACHE_CB_RECOVERY_TIMEOUT=60000
CACHE_CB_MONITORING_PERIOD=300000
CACHE_CB_HALF_OPEN_MAX_CALLS=3

# Cache Keys
CACHE_KEY_PREFIX=chat
CACHE_KEY_VERSION=v1
CACHE_KEY_SEPARATOR=:
CACHE_MAX_KEY_LENGTH=250

# TTL Settings (seconds)
CACHE_PROFILE_TTL=86400        # 24 hours
CACHE_PRESENCE_TTL=30          # 30 seconds
CACHE_TYPING_TTL=5             # 5 seconds
CACHE_SESSION_TTL=3600         # 1 hour
CACHE_RATE_LIMIT_TTL=60        # 1 minute
CACHE_STALE_MARKER_TTL=300     # 5 minutes

# Performance
CACHE_MAX_LATENCY_MS=100
CACHE_BATCH_SIZE=100
CACHE_WARMUP_ENABLED=true
CACHE_METRICS_ENABLED=true

# Distributed Lock
CACHE_LOCK_DEFAULT_TTL=30
CACHE_LOCK_RETRY_DELAY=100
CACHE_LOCK_MAX_RETRIES=3
```

### Module Integration

```typescript
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CacheModule } from "./infrastructure/cache/cache.module";
import cacheConfig from "./infrastructure/cache/cache.config";

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [cacheConfig],
    }),
    CacheModule,
  ],
})
export class AppModule {}
```

## Key Patterns

### Profile Caching

- **Pattern**: `chat:v1:profile:user:{userId}`
- **TTL**: 24 hours
- **Strategy**: Stale-while-revalidate with 5-minute stale marker

### Presence Tracking

- **Pattern**: `chat:v1:presence:{userId}`
- **TTL**: 30 seconds
- **Strategy**: Direct cache with heartbeat updates

### Typing Indicators

- **Pattern**: `chat:v1:typing:{conversationId}:{userId}`
- **TTL**: 5 seconds
- **Strategy**: Direct cache with automatic expiration

### Message Queues

- **Pattern**: `chat:v1:queue:{userId}`
- **TTL**: No expiration
- **Strategy**: Redis lists with manual cleanup

### Unread Counts

- **Pattern**: `chat:v1:unread:{userId}:{conversationId}`
- **TTL**: No expiration
- **Strategy**: Direct cache with manual updates

## Monitoring and Metrics

### Available Metrics

- **Hit Rate**: Cache hit percentage over different time windows
- **Latency**: P95 and P99 latency for cache operations
- **Throughput**: Operations per second
- **Error Rate**: Percentage of failed operations
- **Circuit Breaker State**: Current state and transition history
- **Active Locks**: Number of currently held distributed locks

### Prometheus Integration

The cache infrastructure exports metrics in Prometheus format:

```
# Cache hit rate
cache_hit_rate{window="5m"} 0.95

# Operation latency
cache_operation_latency_seconds{quantile="0.95"} 0.002

# Circuit breaker state
cache_circuit_breaker_state 0  # 0=closed, 1=open, 2=half-open

# Active locks
cache_active_locks 5
```

## Best Practices

### 1. Key Design

- Use consistent namespacing
- Include version in keys for migrations
- Keep keys under 250 characters
- Use meaningful, hierarchical naming

### 2. TTL Strategy

- Set appropriate TTLs based on data volatility
- Use stale-while-revalidate for expensive operations
- Consider business requirements for data freshness

### 3. Error Handling

- Always handle cache failures gracefully
- Implement fallback to data source
- Use circuit breaker for external dependencies

### 4. Performance

- Use batch operations when possible
- Implement cache warming for critical data
- Monitor and optimize based on metrics

### 5. Security

- Use Redis AUTH for production
- Implement proper network security
- Sanitize cache keys to prevent injection

## Troubleshooting

### Common Issues

1. **High Cache Miss Rate**

   - Check TTL settings
   - Verify cache warming strategy
   - Monitor invalidation patterns

2. **Circuit Breaker Opening**

   - Check Redis connectivity
   - Review error logs
   - Adjust failure thresholds if needed

3. **Lock Contention**

   - Review lock timeout settings
   - Check for deadlock scenarios
   - Monitor lock acquisition metrics

4. **Memory Usage**
   - Implement proper TTL policies
   - Monitor key expiration
   - Use Redis memory optimization features

### Debugging

Enable debug logging:

```bash
LOG_LEVEL=debug
```

Check circuit breaker status:

```typescript
const metrics = circuitBreakerService.getMetrics();
console.log("Circuit breaker state:", metrics.state);
```

Monitor cache metrics:

```typescript
const snapshot = cacheMetricsService.getMetricsSnapshot();
console.log("Hit rate:", snapshot.performance.hitRate);
```

## Testing

The cache infrastructure includes comprehensive testing utilities:

```typescript
// Mock cache service for unit tests
const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  // ... other methods
};

// Integration tests with Redis test containers
// (Implementation would use testcontainers library)
```

## Future Enhancements

1. **Multi-level Caching**: Add L1 (in-memory) and L2 (Redis) cache layers
2. **Cache Compression**: Implement automatic compression for large values
3. **Geo-distributed Caching**: Add support for multi-region cache replication
4. **Advanced Eviction Policies**: Implement LRU, LFU, and custom eviction strategies
5. **Cache Analytics**: Add detailed analytics and reporting dashboard
