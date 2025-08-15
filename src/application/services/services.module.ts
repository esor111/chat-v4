import { Module, OnModuleInit } from '@nestjs/common';
import { WebSocketMessageService } from './websocket-message.service';
import { ConversationService } from './conversation.service';
import { ChatGateway } from '@infrastructure/websocket/chat.gateway';
import { RepositoryModule } from '@infrastructure/repositories/repository.module';
import { WebSocketModule } from '@infrastructure/websocket/websocket.module';
import { ProfileModule } from '@infrastructure/profile/profile.module';

@Module({
  imports: [
    RepositoryModule,
    WebSocketModule,
    ProfileModule,
  ],
  providers: [
    WebSocketMessageService,
    ConversationService,
  ],
  exports: [
    WebSocketMessageService,
    ConversationService,
  ],
})
export class ServicesModule implements OnModuleInit {
  constructor(
    private readonly messageService: WebSocketMessageService,
    private readonly chatGateway: ChatGateway,
  ) {}

  onModuleInit() {
    // Inject message service into chat gateway to avoid circular dependency
    this.chatGateway.setMessageService(this.messageService);
  }
}