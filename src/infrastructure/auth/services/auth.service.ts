import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IAuthService, JwtPayload, AuthUser } from '../interfaces/auth.interface';
import { TokenService } from './token.service';
import { StructuredLoggerService } from '@infrastructure/logging/structured-logger.service';

@Injectable()
export class AuthService implements IAuthService {
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly refreshSecret: string;
  private readonly refreshExpiresIn: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly tokenService: TokenService,
    private readonly logger: StructuredLoggerService,
  ) {
    this.jwtSecret = this.configService.get<string>('JWT_SECRET');
    this.jwtExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '24h');
    this.refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    this.refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
  }

  async validateUser(payload: JwtPayload): Promise<AuthUser | null> {
    try {
      // Accept tokens that provide either `userId` or `id` (normalized to userId)
      const normalizedUserId = (payload.userId ?? payload.id) as string | undefined;
      if (!normalizedUserId || typeof normalizedUserId !== 'string') {
        this.logger.security('Invalid user ID in JWT payload', { userId: payload.userId, id: payload.id });
        return null;
      }

      this.logger.debug('User validated successfully', {
        service: 'AuthService',
        operation: 'validateUser',
        userId: normalizedUserId,
        kahaId: payload.kahaId,
      });

      return { userId: normalizedUserId };
    } catch (error) {
      this.logger.error('Failed to validate user', error, {
        service: 'AuthService',
        operation: 'validateUser',
        userId: payload?.userId ?? payload?.id,
      });
      return null;
    }
  }

  async generateTokens(userId: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const payload: JwtPayload = { userId };

      const accessToken = this.tokenService.sign(
        payload,
        this.jwtSecret,
        { expiresIn: this.jwtExpiresIn }
      );

      const refreshToken = this.tokenService.sign(
        payload,
        this.refreshSecret,
        { expiresIn: this.refreshExpiresIn }
      );

      this.logger.audit('Tokens generated', { userId }, {
        service: 'AuthService',
        operation: 'generateTokens',
      });

      return { accessToken, refreshToken };
    } catch (error) {
      this.logger.error('Failed to generate tokens', error, {
        service: 'AuthService',
        operation: 'generateTokens',
        userId,
      });
      throw new UnauthorizedException('Failed to generate tokens');
    }
  }

  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      const payload = this.tokenService.verify(token, this.jwtSecret) as JwtPayload;
      // Normalize: if token contains `id` but not `userId`, map it for downstream consumers
      if (!payload.userId && payload.id) {
        payload.userId = payload.id;
      }

      this.logger.debug('Token verified successfully', {
        service: 'AuthService',
        operation: 'verifyToken',
        userId: payload.userId ?? payload.id,
        kahaId: payload.kahaId,
      });

      return payload;
    } catch (error) {
      this.logger.security('Token verification failed', { error: error.message }, {
        service: 'AuthService',
        operation: 'verifyToken',
      });
      throw new UnauthorizedException('Invalid token');
    }
  }

  async refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const payload = this.tokenService.verify(refreshToken, this.refreshSecret) as JwtPayload;
      const normalizedUserId = (payload.userId ?? payload.id) as string | undefined;
      if (!normalizedUserId) {
        throw new UnauthorizedException('Invalid refresh token payload');
      }

      const tokens = await this.generateTokens(normalizedUserId);

      this.logger.audit('Tokens refreshed', { userId: payload.userId }, {
        service: 'AuthService',
        operation: 'refreshTokens',
      });

      return tokens;
    } catch (error) {
      this.logger.security('Token refresh failed', { error: error.message }, {
        service: 'AuthService',
        operation: 'refreshTokens',
      });
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}