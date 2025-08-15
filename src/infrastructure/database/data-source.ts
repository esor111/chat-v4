import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import { DatabaseConfig } from '../config/database.config';

// Load environment variables
dotenv.config();

const configService = new ConfigService();

// Create database configuration
const createDatabaseConfig = (): DatabaseConfig => {
  return {
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: configService.get<number>('DB_PORT', 5432),
    username: configService.get<string>('DB_USERNAME', 'postgres'),
    password: configService.get<string>('DB_PASSWORD', 'password'),
    database: configService.get<string>('DB_NAME', 'chat_backend'),
    poolSize: configService.get<number>('DB_POOL_SIZE', 10),
    connectionTimeout: configService.get<number>('DB_CONNECTION_TIMEOUT', 60000),
    idleTimeout: configService.get<number>('DB_IDLE_TIMEOUT', 10000),
  };
};

const dbConfig = createDatabaseConfig();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: dbConfig.host,
  port: dbConfig.port,
  username: dbConfig.username,
  password: dbConfig.password,
  database: dbConfig.database,
  entities: ['src/domain/entities/*.entity.ts'],
  migrations: ['src/infrastructure/database/migrations/*.ts'],
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: configService.get<string>('NODE_ENV') === 'development',
  extra: {
    max: dbConfig.poolSize,
    connectionTimeoutMillis: dbConfig.connectionTimeout,
    idleTimeoutMillis: dbConfig.idleTimeout,
  },
});