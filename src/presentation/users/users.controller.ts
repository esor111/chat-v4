import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '@infrastructure/auth/decorators/current-user.decorator';
import { AuthUser } from '@infrastructure/auth/interfaces/auth.interface';
import { StructuredLoggerService } from '@infrastructure/logging/structured-logger.service';

@Controller('users')
export class UsersController {
  constructor(private readonly logger: StructuredLoggerService) {}

  @Get('profile')
  async getProfile(@CurrentUser() user: AuthUser) {
    this.logger.log('User profile requested', {
      service: 'UsersController',
      operation: 'getProfile',
      userId: user.userId,
    });

    return {
      message: 'User profile endpoint',
      userId: user.userId,
      timestamp: new Date().toISOString(),
    };
  }
}