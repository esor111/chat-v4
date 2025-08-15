import { Controller, Get, UseGuards, Inject } from '@nestjs/common';
import { CurrentUser } from '@infrastructure/auth/decorators/current-user.decorator';
import { AuthUser } from '@infrastructure/auth/interfaces/auth.interface';
import { StructuredLoggerService } from '@infrastructure/logging/structured-logger.service';
import { JwtAuthGuard } from '@infrastructure/auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IUserQueryRepository } from '@domain/repositories/user.repository.interface';
import { ProfileMockService } from '@infrastructure/profile/profile-mock.service';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('api/users')
export class UsersController {
  constructor(
    private readonly logger: StructuredLoggerService,
    @Inject('IUserQueryRepository') private readonly users: IUserQueryRepository,
    private readonly profileService: ProfileMockService,
  ) {}

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

  @Get()
  async listUsers(@CurrentUser() user: AuthUser) {
    this.logger.log('Users list requested', {
      service: 'UsersController',
      operation: 'listUsers',
      requesterId: user.userId,
    });

    // Get all active users from the database
    const allUsers = await this.users.findActiveUsers([]);
    const userIds = allUsers
      .map(u => u.userId)
      .filter(id => id !== user.userId); // Exclude the current user

    // Get user profiles from the profile service
    const userProfiles = await this.profileService.getUserProfiles(userIds);
    const businessProfiles = await this.profileService.getBusinessProfiles(userIds);

    // Combine user and business profiles
    const allProfiles = [...userProfiles, ...businessProfiles];

    return { 
      users: allProfiles,
      total: allProfiles.length
    };
  }
}