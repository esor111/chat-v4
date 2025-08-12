import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@domain/entities/user.entity';
import { Conversation } from '@domain/entities/conversation.entity';
import { Message } from '@domain/entities/message.entity';
import { Participant } from '@domain/entities/participant.entity';
import { StructuredLoggerService } from '@infrastructure/logging/structured-logger.service';

// Repository interfaces
import { IUserRepository, IUserQueryRepository, IUserCommandRepository } from '@domain/repositories/user.repository.interface';
import { IConversationRepository, IConversationQueryRepository, IConversationCommandRepository } from '@domain/repositories/conversation.repository.interface';
import { IMessageRepository, IMessageQueryRepository, IMessageCommandRepository } from '@domain/repositories/message.repository.interface';
import { IParticipantRepository, IParticipantQueryRepository, IParticipantCommandRepository } from '@domain/repositories/participant.repository.interface';
import { ITransactionManager } from '@domain/repositories/unit-of-work.interface';

// Repository implementations
import { UserRepository, UserQueryRepository, UserCommandRepository } from './user.repository';
import { ConversationRepository, ConversationQueryRepository, ConversationCommandRepository } from './conversation.repository';
import { MessageRepository, MessageQueryRepository, MessageCommandRepository } from './message.repository';
import { ParticipantRepository, ParticipantQueryRepository, ParticipantCommandRepository } from './participant.repository';
import { TransactionManager } from './unit-of-work';

// Decorators
import { CachedUserQueryRepository } from './decorators/cached-repository.decorator';
import { PerformanceMonitoringUserRepository } from './decorators/performance-monitoring.decorator';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Conversation, Message, Participant]),
  ],
  providers: [
    // Logging service
    StructuredLoggerService,

    // Base repository implementations
    UserRepository,
    UserQueryRepository,
    UserCommandRepository,
    ConversationRepository,
    ConversationQueryRepository,
    ConversationCommandRepository,
    MessageRepository,
    MessageQueryRepository,
    MessageCommandRepository,
    ParticipantRepository,
    ParticipantQueryRepository,
    ParticipantCommandRepository,

    // Transaction management
    TransactionManager,

    // Repository interface bindings (simplified for now)
    {
      provide: 'IUserRepository',
      useClass: UserRepository,
    },
    {
      provide: 'IUserQueryRepository',
      useClass: UserQueryRepository,
    },
    {
      provide: 'IUserCommandRepository',
      useClass: UserCommandRepository,
    },
    {
      provide: 'IConversationRepository',
      useClass: ConversationRepository,
    },
    {
      provide: 'IConversationQueryRepository',
      useClass: ConversationQueryRepository,
    },
    {
      provide: 'IConversationCommandRepository',
      useClass: ConversationCommandRepository,
    },
    {
      provide: 'IMessageRepository',
      useClass: MessageRepository,
    },
    {
      provide: 'IMessageQueryRepository',
      useClass: MessageQueryRepository,
    },
    {
      provide: 'IMessageCommandRepository',
      useClass: MessageCommandRepository,
    },
    {
      provide: 'IParticipantRepository',
      useClass: ParticipantRepository,
    },
    {
      provide: 'IParticipantQueryRepository',
      useClass: ParticipantQueryRepository,
    },
    {
      provide: 'IParticipantCommandRepository',
      useClass: ParticipantCommandRepository,
    },
    {
      provide: 'ITransactionManager',
      useClass: TransactionManager,
    },
  ],
  exports: [
    // Export interface tokens for dependency injection
    'IUserRepository',
    'IUserQueryRepository',
    'IUserCommandRepository',
    'IConversationRepository',
    'IConversationQueryRepository',
    'IConversationCommandRepository',
    'IMessageRepository',
    'IMessageQueryRepository',
    'IMessageCommandRepository',
    'IParticipantRepository',
    'IParticipantQueryRepository',
    'IParticipantCommandRepository',
    'ITransactionManager',
  ],
})
export class RepositoryModule {}