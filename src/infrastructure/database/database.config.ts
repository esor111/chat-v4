import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '@domain/entities/user.entity';
import { Conversation } from '@domain/entities/conversation.entity';
import { Participant } from '@domain/entities/participant.entity';
import { Message } from '@domain/entities/message.entity';

export const databaseConfig = (): TypeOrmModuleOptions => {
  const configService = new ConfigService();
  
  const baseConfig: TypeOrmModuleOptions = {
    type: 'postgres',
    host: configService.get<string>('DB_HOST'),
    port: configService.get<number>('DB_PORT', 5432),
    username: configService.get<string>('DB_USERNAME'),
    password: configService.get<string>('DB_PASSWORD'),
    database: configService.get<string>('DB_NAME'),
    entities: [User, Conversation, Participant, Message],
    synchronize: false, // Disable auto-sync to prevent schema conflicts
    logging: configService.get<string>('NODE_ENV') === 'development' ? ['query', 'error'] : ['error'],
    
    // Connection pooling
    extra: {
      max: configService.get<number>('DB_POOL_SIZE', 10),
      connectionTimeoutMillis: configService.get<number>('DB_CONNECTION_TIMEOUT', 60000),
      idleTimeoutMillis: configService.get<number>('DB_IDLE_TIMEOUT', 10000),
    },

    // Migration configuration
    migrations: ['dist/infrastructure/database/migrations/*.js'],
    migrationsTableName: 'migrations',
    migrationsRun: false,
  };

  return baseConfig;
};