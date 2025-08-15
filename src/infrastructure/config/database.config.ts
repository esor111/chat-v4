import { registerAs } from '@nestjs/config';
import { IsString, IsNumber, IsOptional, validateSync } from 'class-validator';
import { plainToClass, Transform } from 'class-transformer';

export class DatabaseConfig {
  @IsString()
  host: string = 'localhost';

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  port: number = 5432;

  @IsString()
  username: string = 'postgres';

  @IsString()
  password: string = 'password';

  @IsString()
  database: string = 'chat_backend';

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  poolSize?: number = 10;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  connectionTimeout?: number = 60000;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  idleTimeout?: number = 10000;
}

export default registerAs('database', (): DatabaseConfig => {
  const config = plainToClass(DatabaseConfig, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    poolSize: process.env.DB_POOL_SIZE,
    connectionTimeout: process.env.DB_CONNECTION_TIMEOUT,
    idleTimeout: process.env.DB_IDLE_TIMEOUT,
  });

  const errors = validateSync(config);
  if (errors.length > 0) {
    throw new Error(`Database configuration validation failed: ${errors.toString()}`);
  }

  return config;
});