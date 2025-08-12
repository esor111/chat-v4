import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '@infrastructure/auth/decorators/current-user.decorator';
import { AuthUser } from '@infrastructure/auth/interfaces/auth.interface';
import { StructuredLoggerService } from '@infrastructure/logging/structured-logger.service';

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly logger: StructuredLoggerService) {}

  @Get()
  async getConversations(@CurrentUser() user: AuthUser) {
    this.logger.log('Conversations list requested', {
      service: 'ConversationsController',
      operation: 'getConversations',
      userId: user.userId,
    });

    return {
      message: 'Conversations endpoint',
      userId: user.userId,
      conversations: [],
      timestamp: new Date().toISOString(),
    };
  }
}