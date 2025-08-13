import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '@infrastructure/auth/decorators/current-user.decorator';
import { AuthUser } from '@infrastructure/auth/interfaces/auth.interface';
import { StructuredLoggerService } from '@infrastructure/logging/structured-logger.service';
import { JwtAuthGuard } from '@infrastructure/auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('api/users')
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