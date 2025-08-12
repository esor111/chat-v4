import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@presentation/auth/auth.module';
import { ChatModule } from '@presentation/chat/chat.module';
import { UsersModule } from '@presentation/users/users.module';
import { ConversationsModule } from '@presentation/conversations/conversations.module';
import { ApiModule } from '@presentation/api/api.module';
import { InfrastructureModule } from '@infrastructure/infrastructure.module';
import { CorrelationIdMiddleware } from '@infrastructure/logging/correlation-id.middleware';
import { configValidationSchema } from '@infrastructure/config/config.validation';
import { databaseConfig } from '@infrastructure/database/database.config';

@Module({
  imports: [
    // Configuration with validation
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: configValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    
    // Database configuration
    TypeOrmModule.forRootAsync({
      useFactory: databaseConfig,
      inject: [],
    }),
    
    // Infrastructure layer
    InfrastructureModule,
    
    // Presentation layer modules
    AuthModule,
    ChatModule,
    UsersModule,
    ConversationsModule,
    ApiModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationIdMiddleware)
      .forRoutes('*');
  }
}