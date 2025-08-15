import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatGateway } from './chat.gateway';
import { WebSocketConnectionService } from './services/websocket-connection.service';
import { WebSocketBroadcastService } from './services/websocket-broadcast.service';
import { ConversationAccessService } from './services/conversation-access.service';
import { WebSocketErrorService } from './services/websocket-error.service';
import { InputSanitizationService } from './services/input-sanitization.service';
import { RateLimitingService } from './services/rate-limiting.service';
import { WebSocketMessageHandlerService } from './services/websocket-message-handler.service';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { RepositoryModule } from '@infrastructure/repositories/repository.module';

@Module({
  imports: [
    RepositoryModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('EXTERNAL_JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    ChatGateway,
    WebSocketConnectionService,
    WebSocketBroadcastService,
    ConversationAccessService,
    WebSocketErrorService,
    InputSanitizationService,
    RateLimitingService,
    WebSocketMessageHandlerService,
    WsJwtGuard,
  ],
  exports: [
    ChatGateway,
    WebSocketConnectionService,
    WebSocketBroadcastService,
    ConversationAccessService,
  ],
})
export class WebSocketModule {}