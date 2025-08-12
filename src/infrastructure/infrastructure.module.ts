import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

// Auth services and strategies
import { AuthService } from './auth/services/auth.service';
import { TokenService } from './auth/services/token.service';
import { JwtStrategy } from './auth/strategies/jwt.strategy';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

// Logging services
import { StructuredLoggerService } from './logging/structured-logger.service';

// Cache and Profile modules
import { CacheModule } from './cache/cache.module';
import { ProfileModule } from './profile/profile.module';
import { WebSocketModule } from './websocket/websocket.module';
import { ServicesModule } from '@application/services/services.module';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '24h'),
        },
      }),
      inject: [ConfigService],
    }),
    CacheModule,
    ProfileModule,
    WebSocketModule,
    ServicesModule,
  ],
  providers: [
    // Auth providers
    AuthService,
    TokenService,
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    
    // Logging providers
    StructuredLoggerService,
  ],
  exports: [
    AuthService,
    TokenService,
    JwtStrategy,
    StructuredLoggerService,
    PassportModule,
    JwtModule,
  ],
})
export class InfrastructureModule {}