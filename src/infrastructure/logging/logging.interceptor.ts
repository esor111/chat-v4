import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { correlationStorage } from './correlation-id.middleware';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const correlationContext = correlationStorage.getStore();

    const logData = {
      method: request.method,
      url: request.url,
      userAgent: request.get('user-agent'),
      ip: request.ip,
      correlationId: correlationContext?.correlationId,
      requestId: correlationContext?.requestId,
      userId: correlationContext?.userId,
    };

    this.logger.log({
      message: 'Incoming request',
      ...logData,
    });

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        this.logger.log({
          message: 'Request completed',
          ...logData,
          statusCode: response.statusCode,
          duration: `${duration}ms`,
        });
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        this.logger.error({
          message: 'Request failed',
          ...logData,
          statusCode: response.statusCode,
          duration: `${duration}ms`,
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
        });
        throw error;
      }),
    );
  }
}