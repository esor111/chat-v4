import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '@domain/entities/user.entity';
import { Conversation } from '@domain/entities/conversation.entity';
import { Participant } from '@domain/entities/participant.entity';
import { Message } from '@domain/entities/message.entity';

const configService = new ConfigService();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: configService.get<string>('DB_HOST', 'localhost'),
  port: configService.get<number>('DB_PORT', 5432),
  username: configService.get<string>('DB_USERNAME', 'postgres'),
  password: configService.get<string>('DB_PASSWORD', 'password'),
  database: configService.get<string>('DB_NAME', 'chat_backend'),
  entities: [User, Conversation, Participant, Message],
  migrations: ['src/infrastructure/database/migrations/*.ts'],
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: configService.get<string>('NODE_ENV') === 'development',
  ssl: configService.get<boolean>('DB_SSL', false) ? { rejectUnauthorized: false } : false,
});