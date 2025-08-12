import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheKeyStrategy } from './cache.interface';

export interface CacheKeyConfig {
  prefix: string;
  version: string;
  separator: string;
  maxKeyLength: number;
}

@Injectable()
export class CacheKeyStrategyService implements CacheKeyStrategy {
  private readonly config: CacheKeyConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      prefix: this.configService.get('cache.keyPrefix', 'chat'),
      version: this.configService.get('cache.keyVersion', 'v1'),
      separator: this.configService.get('cache.keySeparator', ':'),
      maxKeyLength: this.configService.get('cache.maxKeyLength', 250),
    };
  }

  generateKey(namespace: string, identifier: string | number, ...parts: string[]): string {
    const keyParts = [
      this.config.prefix,
      this.config.version,
      namespace,
      identifier.toString(),
      ...parts.filter(part => part && part.length > 0)
    ];

    const key = keyParts.join(this.config.separator);
    
    if (key.length > this.config.maxKeyLength) {
      // If key is too long, hash the identifier and parts
      const hashedSuffix = this.hashString(keyParts.slice(3).join(this.config.separator));
      const baseKey = [this.config.prefix, this.config.version, namespace].join(this.config.separator);
      return `${baseKey}${this.config.separator}${hashedSuffix}`;
    }

    return key;
  }

  parseKey(key: string): { namespace: string; identifier: string; parts: string[] } {
    const keyParts = key.split(this.config.separator);
    
    if (keyParts.length < 4) {
      throw new Error(`Invalid cache key format: ${key}`);
    }

    // Remove prefix and version
    const [, , namespace, identifier, ...parts] = keyParts;
    
    return {
      namespace,
      identifier,
      parts: parts || [],
    };
  }

  // Predefined key generators for common use cases
  generateUserProfileKey(userId: number): string {
    return this.generateKey('profile', 'user', userId.toString());
  }

  generateBusinessProfileKey(businessId: number): string {
    return this.generateKey('profile', 'business', businessId.toString());
  }

  generatePresenceKey(userId: number): string {
    return this.generateKey('presence', userId);
  }

  generateTypingKey(conversationId: number, userId: number): string {
    return this.generateKey('typing', conversationId, userId.toString());
  }

  generateMessageQueueKey(userId: number): string {
    return this.generateKey('queue', userId);
  }

  generateUnreadCountKey(userId: number, conversationId: number): string {
    return this.generateKey('unread', userId, conversationId.toString());
  }

  generateConversationListKey(userId: number): string {
    return this.generateKey('convo_list', userId);
  }

  generateStaleMarkerKey(namespace: string, identifier: string | number): string {
    return this.generateKey('stale', namespace, identifier.toString());
  }

  generateLockKey(resource: string, identifier: string | number): string {
    return this.generateKey('lock', resource, identifier.toString());
  }

  generateSessionKey(sessionId: string): string {
    return this.generateKey('session', sessionId);
  }

  generateRateLimitKey(userId: number, endpoint: string): string {
    return this.generateKey('ratelimit', userId, endpoint);
  }

  // Pattern generators for bulk operations
  generateUserProfilePattern(): string {
    return this.generateKey('profile', 'user', '*');
  }

  generateBusinessProfilePattern(): string {
    return this.generateKey('profile', 'business', '*');
  }

  generatePresencePattern(): string {
    return this.generateKey('presence', '*');
  }

  generateTypingPattern(conversationId?: number): string {
    if (conversationId) {
      return this.generateKey('typing', conversationId, '*');
    }
    return this.generateKey('typing', '*');
  }

  generateStaleMarkerPattern(namespace?: string): string {
    if (namespace) {
      return this.generateKey('stale', namespace, '*');
    }
    return this.generateKey('stale', '*');
  }

  generateUserDataPattern(userId: number): string {
    return this.generateKey('*', userId, '*');
  }

  // Utility methods
  isValidKey(key: string): boolean {
    try {
      this.parseKey(key);
      return true;
    } catch {
      return false;
    }
  }

  extractUserId(key: string): number | null {
    try {
      const parsed = this.parseKey(key);
      const userId = parseInt(parsed.identifier, 10);
      return isNaN(userId) ? null : userId;
    } catch {
      return null;
    }
  }

  extractNamespace(key: string): string | null {
    try {
      const parsed = this.parseKey(key);
      return parsed.namespace;
    } catch {
      return null;
    }
  }

  // Key versioning support
  generateVersionedKey(namespace: string, identifier: string | number, version: string, ...parts: string[]): string {
    const keyParts = [
      this.config.prefix,
      version,
      namespace,
      identifier.toString(),
      ...parts.filter(part => part && part.length > 0)
    ];

    return keyParts.join(this.config.separator);
  }

  migrateKey(oldKey: string, newVersion: string): string {
    try {
      const parsed = this.parseKey(oldKey);
      return this.generateVersionedKey(parsed.namespace, parsed.identifier, newVersion, ...parsed.parts);
    } catch {
      throw new Error(`Cannot migrate invalid key: ${oldKey}`);
    }
  }

  // Key expiration helpers
  getTTLFromKey(key: string): number | null {
    const namespace = this.extractNamespace(key);
    
    // Default TTLs based on namespace
    const defaultTTLs: Record<string, number> = {
      'profile': 24 * 60 * 60, // 24 hours
      'presence': 30, // 30 seconds
      'typing': 5, // 5 seconds
      'stale': 5 * 60, // 5 minutes
      'session': 60 * 60, // 1 hour
      'ratelimit': 60, // 1 minute
    };

    return namespace ? defaultTTLs[namespace] || null : null;
  }

  private hashString(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }
}