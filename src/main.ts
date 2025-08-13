import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { LoggingInterceptor } from '@infrastructure/logging/logging.interceptor';
import { CorrelationIdMiddleware } from '@infrastructure/logging/correlation-id.middleware';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT', 3000);

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // Global interceptors
    app.useGlobalInterceptors(new LoggingInterceptor());

    // CORS configuration
    app.enableCors({
      origin: configService.get<string>('CORS_ORIGIN', '*'),
      credentials: true,
    });

    // Swagger/OpenAPI configuration
    const config = new DocumentBuilder()
      .setTitle('Chat Backend API')
      .setDescription('Real-time chat microservice with WebSocket and REST API support')
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth', // This name here is important for matching up with @ApiBearerAuth() in your controller!
      )
      .addTag('health', 'Health check endpoints')
      .addTag('conversations', 'Conversation management endpoints')
      .addTag('messages', 'Message handling endpoints')
      .addServer(`http://localhost:${port}`, 'Development server')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });

    await app.listen(port);
    logger.log(`Application is running on port ${port}`);
    logger.log(`Swagger documentation available at http://localhost:${port}/api/docs`);
  } catch (error) {
    logger.error('Failed to start application', error);
    process.exit(1);
  }
}

bootstrap();