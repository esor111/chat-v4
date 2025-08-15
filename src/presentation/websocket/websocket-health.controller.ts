import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WebSocketHealthService } from '@infrastructure/websocket/services/websocket-health.service';
import { ChatGateway } from '@infrastructure/websocket/chat.gateway';

@ApiTags('WebSocket Health')
@Controller('websocket')
export class WebSocketHealthController {
  constructor(
    private readonly healthService: WebSocketHealthService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Get WebSocket health status' })
  @ApiResponse({ status: 200, description: 'WebSocket health information' })
  getHealth() {
    return this.healthService.getHealthStatus();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get WebSocket connection statistics' })
  @ApiResponse({ status: 200, description: 'Connection statistics' })
  getStats() {
    return {
      connectedUsers: this.chatGateway.getConnectedUsersCount(),
      timestamp: new Date().toISOString(),
    };
  }
}