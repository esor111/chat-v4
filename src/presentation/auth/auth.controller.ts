import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from '@infrastructure/auth/services/auth.service';
import { Public } from '@infrastructure/auth/decorators/public.decorator';
import { StructuredLoggerService } from '@infrastructure/logging/structured-logger.service';
import { LoginDto, RefreshTokenDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly logger: StructuredLoggerService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    this.logger.log('Login attempt', {
      service: 'AuthController',
      operation: 'login',
      userId: loginDto.userId,
    });

    const tokens = await this.authService.generateTokens(loginDto.userId);
    
    this.logger.audit('User logged in', { userId: loginDto.userId }, {
      service: 'AuthController',
      operation: 'login',
    });

    return {
      message: 'Login successful',
      data: tokens,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    this.logger.log('Token refresh attempt', {
      service: 'AuthController',
      operation: 'refresh',
    });

    const tokens = await this.authService.refreshTokens(refreshTokenDto.refreshToken);
    
    return {
      message: 'Tokens refreshed successfully',
      data: tokens,
    };
  }
}