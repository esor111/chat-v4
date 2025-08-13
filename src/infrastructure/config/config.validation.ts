import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  CORS_ORIGIN: Joi.string().default('*'),

  // Database
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  DB_POOL_SIZE: Joi.number().default(10),
  DB_CONNECTION_TIMEOUT: Joi.number().default(60000),
  DB_IDLE_TIMEOUT: Joi.number().default(10000),

  // Read Replica (optional)
  DB_READ_HOST: Joi.string().optional(),
  DB_READ_PORT: Joi.number().default(5432),
  DB_READ_USERNAME: Joi.string().optional(),
  DB_READ_PASSWORD: Joi.string().optional(),

  // Redis
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional(),
  REDIS_DB: Joi.number().default(0),
  REDIS_CLUSTER_ENABLED: Joi.boolean().default(false),
  REDIS_CLUSTER_NODES: Joi.string().optional(),

  // JWT
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('24h'),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // External Services
  KAHA_MAIN_V3_BASE_URL: Joi.string().required(),
  KAHA_MAIN_V3_SERVICE_TOKEN: Joi.string().required(),
  KAHA_MAIN_V3_TIMEOUT: Joi.number().default(5000),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('info'),
  LOG_FORMAT: Joi.string()
    .valid('json', 'simple')
    .default('json'),

  // Rate Limiting
  RATE_LIMIT_TTL: Joi.number().default(60),
  RATE_LIMIT_MAX: Joi.number().default(100),

  // WebSocket
  WS_HEARTBEAT_INTERVAL: Joi.number().default(30000),
  WS_CONNECTION_TIMEOUT: Joi.number().default(60000),
});