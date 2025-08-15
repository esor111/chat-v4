import { Injectable, Logger } from '@nestjs/common';
import { WebSocketConnectionService } from './websocket-connection.service';
import { RateLimitingService } from './rate-limiting.service';

export interface WebSocketHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  metrics: {
    connectedUsers: number;
    totalConnections: number;
    averageConnectionsPerUser: number;
    rateLimitStats: {
      activeUsers: number;
      totalRequests: number;
      averageRequestsPerUser: number;
    };
  };
  issues?: string[];
}

@Injectable()
export class WebSocketHealthService {
  private readonly logger = new Logger(WebSocketHealthService.name);

  constructor(
    private readonly connectionService: WebSocketConnectionService,
    private readonly rateLimitingService: RateLimitingService,
  ) {}

  /**
   * Get comprehensive health status of WebSocket services
   */
  getHealthStatus(): WebSocketHealthStatus {
    const connectedUsers = this.connectionService.getConnectedUsersCount();
    const rateLimitStats = this.rateLimitingService.getStats();
    const issues: string[] = [];

    // Calculate total connections (would need to be implemented in connection service)
    const totalConnections = connectedUsers; // Simplified for now
    const averageConnectionsPerUser = connectedUsers > 0 ? totalConnections / connectedUsers : 0;

    // Health checks
    if (connectedUsers > 10000) {
      issues.push('High number of connected users may impact performance');
    }

    if (averageConnectionsPerUser > 5) {
      issues.push('High average connections per user detected');
    }

    if (rateLimitStats.averageRequestsPerUser > 50) {
      issues.push('High request rate detected');
    }

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (issues.length > 0) {
      status = issues.length > 2 ? 'unhealthy' : 'degraded';
    }

    const healthStatus: WebSocketHealthStatus = {
      status,
      timestamp: new Date().toISOString(),
      metrics: {
        connectedUsers,
        totalConnections,
        averageConnectionsPerUser,
        rateLimitStats,
      },
      issues: issues.length > 0 ? issues : undefined,
    };

    if (status !== 'healthy') {
      this.logger.warn('WebSocket health check detected issues', { healthStatus });
    }

    return healthStatus;
  }

  /**
   * Perform cleanup operations to improve health
   */
  async performMaintenance(): Promise<void> {
    try {
      this.logger.log('Starting WebSocket maintenance tasks');

      // Clean up rate limiting data
      this.rateLimitingService.cleanup();

      // Additional cleanup tasks could go here
      // - Clean up stale connections
      // - Clear old cache entries
      // - Reset metrics

      this.logger.log('WebSocket maintenance completed');
    } catch (error) {
      this.logger.error('Error during WebSocket maintenance', error);
    }
  }

  /**
   * Get simple health check for monitoring systems
   */
  isHealthy(): boolean {
    const status = this.getHealthStatus();
    return status.status === 'healthy';
  }
}