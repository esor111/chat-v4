import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '@infrastructure/auth/decorators/current-user.decorator';
import { AuthUser } from '@infrastructure/auth/interfaces/auth.interface';
import { StructuredLoggerService } from '@infrastructure/logging/structured-logger.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly logger: StructuredLoggerService) {}

  @Get('health')
  async getHealth(@CurrentUser() user: AuthUser) {
    this.logger.log('Chat health check', {
      service: 'ChatController',
      operation: 'getHealth',
      userId: user.userId,
    });

    return {
      message: 'Chat service is healthy',
      timestamp: new Date().toISOString(),
      userId: user.userId,
    };
  }
}