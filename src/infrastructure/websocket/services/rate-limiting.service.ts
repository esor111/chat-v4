import { Injectable, Logger } from '@nestjs/common';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  burstAllowance?: number; // Allow burst requests
}

interface UserRateLimit {
  requests: number[];
  lastReset: number;
  burstUsed: number;
}

export interface RateLimitOptions {
  message?: Partial<RateLimitConfig>;
  typing?: Partial<RateLimitConfig>;
  join?: Partial<RateLimitConfig>;
}

@Injectable()
export class RateLimitingService {
  private readonly logger = new Logger(RateLimitingService.name);
  private readonly userLimits = new Map<string, UserRateLimit>();

  private readonly configs: Record<string, RateLimitConfig> = {
    message: { windowMs: 60000, maxRequests: 30, burstAllowance: 5 }, // 30 messages per minute, 5 burst
    typing: { windowMs: 5000, maxRequests: 10 }, // 10 typing events per 5 seconds
    join: { windowMs: 10000, maxRequests: 5 }, // 5 joins per 10 seconds
  };

  constructor() {
    // Options can be set via setOptions method if needed
  }

  /**
   * Set rate limiting options after instantiation
   */
  setOptions(options: RateLimitOptions): void {
    if (options) {
      Object.keys(options).forEach(key => {
        if (this.configs[key]) {
          this.configs[key] = { ...this.configs[key], ...options[key] };
        }
      });
    }
  }

  /**
   * Check if user is within rate limits for a specific action
   */
  isWithinLimit(userId: string, action: string): boolean {
    const config = this.configs[action];
    if (!config) {
      this.logger.warn(`No rate limit config found for action: ${action}`);
      return true; // Allow if no config
    }

    const now = Date.now();
    let userLimit = this.userLimits.get(userId);

    if (!userLimit) {
      userLimit = { requests: [], lastReset: now, burstUsed: 0 };
      this.userLimits.set(userId, userLimit);
    }

    // Clean old requests outside the window
    userLimit.requests = userLimit.requests.filter(
      timestamp => now - timestamp < config.windowMs
    );

    // Check if within limit
    if (userLimit.requests.length >= config.maxRequests) {
      this.logger.warn(
        `Rate limit exceeded for user ${userId} on action ${action}: ${userLimit.requests.length}/${config.maxRequests}`
      );
      return false;
    }

    // Add current request
    userLimit.requests.push(now);
    return true;
  }

  /**
   * Get remaining requests for a user and action
   */
  getRemainingRequests(userId: string, action: string): number {
    const config = this.configs[action];
    if (!config) return Infinity;

    const userLimit = this.userLimits.get(userId);
    if (!userLimit) return config.maxRequests;

    const now = Date.now();
    const validRequests = userLimit.requests.filter(
      timestamp => now - timestamp < config.windowMs
    );

    return Math.max(0, config.maxRequests - validRequests.length);
  }

  /**
   * Reset rate limits for a user (useful for testing or admin actions)
   */
  resetUserLimits(userId: string): void {
    this.userLimits.delete(userId);
    this.logger.debug(`Reset rate limits for user ${userId}`);
  }

  /**
   * Clean up old rate limit data (should be called periodically)
   */
  cleanup(): void {
    const now = Date.now();
    const maxWindowMs = Math.max(...Object.values(this.configs).map(c => c.windowMs));

    for (const [userId, userLimit] of this.userLimits.entries()) {
      // Remove requests older than the largest window
      userLimit.requests = userLimit.requests.filter(
        timestamp => now - timestamp < maxWindowMs
      );

      // Remove user entry if no recent requests
      if (userLimit.requests.length === 0 && now - userLimit.lastReset > maxWindowMs) {
        this.userLimits.delete(userId);
      }
    }

    this.logger.debug(`Cleaned up rate limit data. Active users: ${this.userLimits.size}`);
  }

  /**
   * Get rate limiting statistics
   */
  getStats(): {
    activeUsers: number;
    totalRequests: number;
    averageRequestsPerUser: number;
  } {
    const activeUsers = this.userLimits.size;
    const totalRequests = Array.from(this.userLimits.values())
      .reduce((sum, limit) => sum + limit.requests.length, 0);

    return {
      activeUsers,
      totalRequests,
      averageRequestsPerUser: activeUsers > 0 ? totalRequests / activeUsers : 0,
    };
  }
}