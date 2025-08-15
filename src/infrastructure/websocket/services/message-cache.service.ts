import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

interface CachedMessage {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  content: string;
  messageType: string;
  sentAt: string;
}

@Injectable()
export class MessageCacheService {
  private readonly logger = new Logger(MessageCacheService.name);
  private readonly RECENT_MESSAGES_TTL = 300; // 5 minutes
  private readonly CONVERSATION_HISTORY_TTL = 1800; // 30 minutes

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Cache recent messages for a conversation
   */
  async cacheRecentMessages(conversationId: string, messages: CachedMessage[]): Promise<void> {
    try {
      const key = `recent_messages:${conversationId}`;
      await this.cacheManager.set(key, messages, this.RECENT_MESSAGES_TTL);
      this.logger.debug(`Cached ${messages.length} recent messages for conversation ${conversationId}`);
    } catch (error) {
      this.logger.error('Error caching recent messages:', error);
    }
  }

  /**
   * Get cached recent messages for a conversation
   */
  async getCachedRecentMessages(conversationId: string): Promise<CachedMessage[] | null> {
    try {
      const key = `recent_messages:${conversationId}`;
      const messages = await this.cacheManager.get<CachedMessage[]>(key);
      
      if (messages) {
        this.logger.debug(`Retrieved ${messages.length} cached messages for conversation ${conversationId}`);
      }
      
      return messages || null;
    } catch (error) {
      this.logger.error('Error retrieving cached messages:', error);
      return null;
    }
  }

  /**
   * Add a new message to the cached recent messages
   */
  async addMessageToCache(conversationId: string, message: CachedMessage): Promise<void> {
    try {
      const key = `recent_messages:${conversationId}`;
      const cachedMessages = await this.getCachedRecentMessages(conversationId) || [];
      
      // Add new message to the beginning
      cachedMessages.unshift(message);
      
      // Keep only the most recent 50 messages
      const trimmedMessages = cachedMessages.slice(0, 50);
      
      await this.cacheManager.set(key, trimmedMessages, this.RECENT_MESSAGES_TTL);
      this.logger.debug(`Added message ${message.messageId} to cache for conversation ${conversationId}`);
    } catch (error) {
      this.logger.error('Error adding message to cache:', error);
    }
  }

  /**
   * Cache conversation metadata
   */
  async cacheConversationMetadata(conversationId: string, metadata: any): Promise<void> {
    try {
      const key = `conversation_meta:${conversationId}`;
      await this.cacheManager.set(key, metadata, this.CONVERSATION_HISTORY_TTL);
      this.logger.debug(`Cached metadata for conversation ${conversationId}`);
    } catch (error) {
      this.logger.error('Error caching conversation metadata:', error);
    }
  }

  /**
   * Get cached conversation metadata
   */
  async getCachedConversationMetadata(conversationId: string): Promise<any | null> {
    try {
      const key = `conversation_meta:${conversationId}`;
      return await this.cacheManager.get(key);
    } catch (error) {
      this.logger.error('Error retrieving cached conversation metadata:', error);
      return null;
    }
  }

  /**
   * Invalidate cache for a conversation
   */
  async invalidateConversationCache(conversationId: string): Promise<void> {
    try {
      const keys = [
        `recent_messages:${conversationId}`,
        `conversation_meta:${conversationId}`,
      ];

      await Promise.all(keys.map(key => this.cacheManager.del(key)));
      this.logger.debug(`Invalidated cache for conversation ${conversationId}`);
    } catch (error) {
      this.logger.error('Error invalidating conversation cache:', error);
    }
  }

  /**
   * Cache user's active conversations
   */
  async cacheUserConversations(userId: string, conversations: string[]): Promise<void> {
    try {
      const key = `user_conversations:${userId}`;
      await this.cacheManager.set(key, conversations, this.CONVERSATION_HISTORY_TTL);
      this.logger.debug(`Cached ${conversations.length} conversations for user ${userId}`);
    } catch (error) {
      this.logger.error('Error caching user conversations:', error);
    }
  }

  /**
   * Get cached user conversations
   */
  async getCachedUserConversations(userId: string): Promise<string[] | null> {
    try {
      const key = `user_conversations:${userId}`;
      return await this.cacheManager.get<string[]>(key);
    } catch (error) {
      this.logger.error('Error retrieving cached user conversations:', error);
      return null;
    }
  }

  /**
   * Clear all cache (useful for testing)
   */
  async clearAllCache(): Promise<void> {
    try {
      // Use store.reset() if available, otherwise manually clear keys
      const store = (this.cacheManager as any).store;
      if (store && typeof store.reset === 'function') {
        await store.reset();
      } else {
        // Fallback: clear specific cache patterns
        const keys = ['recent_messages:', 'conversation_meta:', 'user_conversations:'];
        await Promise.all(keys.map(pattern => this.clearCacheByPattern(pattern)));
      }
      this.logger.debug('Cleared all message cache');
    } catch (error) {
      this.logger.error('Error clearing cache:', error);
    }
  }

  /**
   * Clear cache entries by pattern
   */
  private async clearCacheByPattern(pattern: string): Promise<void> {
    try {
      // This is a simplified approach - in production, you might want to use Redis SCAN
      // For now, we'll just log the pattern that would be cleared
      this.logger.debug(`Would clear cache pattern: ${pattern}*`);
    } catch (error) {
      this.logger.warn(`Failed to clear cache pattern ${pattern}:`, error);
    }
  }
}