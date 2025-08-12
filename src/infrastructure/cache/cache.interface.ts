export const CACHE_SERVICE_TOKEN = Symbol('CACHE_SERVICE_TOKEN');

export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  deletePattern(pattern: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  increment(key: string, value?: number): Promise<number>;
  expire(key: string, ttlSeconds: number): Promise<void>;
  
  // Hash operations
  hget<T>(key: string, field: string): Promise<T | null>;
  hset<T>(key: string, field: string, value: T): Promise<void>;
  hdel(key: string, field: string): Promise<void>;
  hgetall<T>(key: string): Promise<Record<string, T>>;
  
  // List operations
  lpush<T>(key: string, ...values: T[]): Promise<number>;
  rpush<T>(key: string, ...values: T[]): Promise<number>;
  lpop<T>(key: string): Promise<T | null>;
  rpop<T>(key: string): Promise<T | null>;
  lrange<T>(key: string, start: number, stop: number): Promise<T[]>;
  
  // Set operations
  sadd<T>(key: string, ...members: T[]): Promise<number>;
  srem<T>(key: string, ...members: T[]): Promise<number>;
  smembers<T>(key: string): Promise<T[]>;
  sismember<T>(key: string, member: T): Promise<boolean>;
}

export interface CacheKeyStrategy {
  generateKey(namespace: string, identifier: string | number, ...parts: string[]): string;
  parseKey(key: string): { namespace: string; identifier: string; parts: string[] };
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  totalOperations: number;
  hitRate: number;
}