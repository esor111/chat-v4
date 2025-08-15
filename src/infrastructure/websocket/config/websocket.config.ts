import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WebSocketConfig {
  cors: {
    origin: string | string[];
    methods: string[];
    credentials: boolean;
  };
  heartbeatInterval: number;
  connectionTimeout: number;
  maxConnectionsPerUser: number;
  rateLimits: {
    message: {
      windowMs: number;
      maxRequests: number;
      burstAllowance: number;
    };
    typing: {
      windowMs: number;
      maxRequests: number;
    };
    join: {
      windowMs: number;
      maxRequests: number;
    };
  };
}

@Injectable()
export class WebSocketConfigService {
  constructor(private readonly configService: ConfigService) {}

  getConfig(): WebSocketConfig {
    return {
      cors: {
        origin: this.configService.get<string>('WS_CORS_ORIGIN', '*'),
        methods: ['GET', 'POST'],
        credentials: true,
      },
      heartbeatInterval: this.configService.get<number>('WS_HEARTBEAT_INTERVAL', 30000),
      connectionTimeout: this.configService.get<number>('WS_CONNECTION_TIMEOUT', 60000),
      maxConnectionsPerUser: this.configService.get<number>('WS_MAX_CONNECTIONS_PER_USER', 5),
      rateLimits: {
        message: {
          windowMs: this.configService.get<number>('WS_MESSAGE_WINDOW_MS', 60000),
          maxRequests: this.configService.get<number>('WS_MESSAGE_MAX_REQUESTS', 30),
          burstAllowance: this.configService.get<number>('WS_MESSAGE_BURST_ALLOWANCE', 5),
        },
        typing: {
          windowMs: this.configService.get<number>('WS_TYPING_WINDOW_MS', 5000),
          maxRequests: this.configService.get<number>('WS_TYPING_MAX_REQUESTS', 10),
        },
        join: {
          windowMs: this.configService.get<number>('WS_JOIN_WINDOW_MS', 10000),
          maxRequests: this.configService.get<number>('WS_JOIN_MAX_REQUESTS', 5),
        },
      },
    };
  }
}