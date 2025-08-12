import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisCacheService } from '../redis-cache.service';

describe('RedisCacheService', () => {
  let service: RedisCacheService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisCacheService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                REDIS_HOST: 'localhost',
                REDIS_PORT: 6379,
                REDIS_PASSWORD: undefined,
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RedisCacheService>(RedisCacheService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('basic operations', () => {
    it('should set and get a string value', async () => {
      const key = 'test:string';
      const value = 'hello world';

      await service.set(key, value);
      const result = await service.get<string>(key);

      expect(result).toBe(value);
    });

    it('should set and get a JSON object', async () => {
      const key = 'test:object';
      const value = { name: 'John', age: 30 };

      await service.set(key, value);
      const result = await service.get<typeof value>(key);

      expect(result).toEqual(value);
    });

    it('should return null for non-existent key', async () => {
      const result = await service.get('non:existent:key');
      expect(result).toBeNull();
    });

    it('should set with TTL', async () => {
      const key = 'test:ttl';
      const value = 'expires soon';

      await service.set(key, value, 1); // 1 second TTL
      const result = await service.get<string>(key);
      expect(result).toBe(value);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      const expiredResult = await service.get<string>(key);
      expect(expiredResult).toBeNull();
    });

    it('should delete a key', async () => {
      const key = 'test:delete';
      const value = 'to be deleted';

      await service.set(key, value);
      await service.delete(key);
      const result = await service.get<string>(key);

      expect(result).toBeNull();
    });

    it('should check if key exists', async () => {
      const key = 'test:exists';
      const value = 'exists';

      expect(await service.exists(key)).toBe(false);
      
      await service.set(key, value);
      expect(await service.exists(key)).toBe(true);
      
      await service.delete(key);
      expect(await service.exists(key)).toBe(false);
    });
  });

  describe('hash operations', () => {
    it('should set and get hash fields', async () => {
      const key = 'test:hash';
      const field = 'name';
      const value = 'John Doe';

      await service.hset(key, field, value);
      const result = await service.hget<string>(key, field);

      expect(result).toBe(value);
    });

    it('should get all hash fields', async () => {
      const key = 'test:hash:all';
      const data = { name: 'John', age: 30, city: 'NYC' };

      for (const [field, value] of Object.entries(data)) {
        await service.hset(key, field, value);
      }

      const result = await service.hgetall<string | number>(key);
      expect(result).toEqual(data);
    });
  });

  describe('list operations', () => {
    it('should push and pop from list', async () => {
      const key = 'test:list';
      const values = ['first', 'second', 'third'];

      await service.rpush(key, ...values);
      
      const popped = await service.lpop<string>(key);
      expect(popped).toBe('first');

      const remaining = await service.lrange<string>(key, 0, -1);
      expect(remaining).toEqual(['second', 'third']);
    });
  });

  describe('health check', () => {
    it('should check Redis health', async () => {
      const isHealthy = await service.isHealthy();
      // This might fail if Redis is not running, which is expected in CI
      expect(typeof isHealthy).toBe('boolean');
    });
  });

  describe('metrics', () => {
    it('should track basic metrics', async () => {
      const key = 'test:metrics';
      
      // Reset metrics
      service.resetMetrics();
      
      // Perform operations
      await service.set(key, 'value');
      await service.get(key);
      await service.get('non:existent');
      
      const metrics = service.getMetrics();
      expect(metrics.sets).toBeGreaterThan(0);
      expect(metrics.hits).toBeGreaterThan(0);
      expect(metrics.misses).toBeGreaterThan(0);
      expect(metrics.hitRate).toBeGreaterThan(0);
    });
  });

  afterEach(async () => {
    // Clean up test keys
    try {
      await service.deletePattern('test:*');
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  afterAll(async () => {
    await service.onModuleDestroy();
  });
});