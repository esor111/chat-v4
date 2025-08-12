import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChatGateway } from './chat.gateway';
import { WsJwtGuard } from './guards/ws-jwt.guard';

@Module({
  imports: [JwtModule],
  providers: [
    ChatGateway,
    WsJwtGuard,
  ],
  exports: [
    ChatGateway,
    WsJwtGuard,
  ],
})
export class WebSocketModule {}