import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { correlationStorage } from './correlation-id.middleware';

export interface LogContext {
  correlationId?: string;
  requestId?: string;
  userId?: number;
  service?: string;
  operation?: string;
  [key: string]: any;
}

@Injectable()
export class StructuredLoggerService {
  private readonly logger = new Logger(StructuredLoggerService.name);
  private readonly logLevel: string;
  private readonly logFormat: 'json' | 'simple';

  constructor(private readonly configService: ConfigService) {
    this.logLevel = this.configService.get<string>('LOG_LEVEL', 'info');
    this.logFormat = this.configService.get<'json' | 'simple'>('LOG_FORMAT', 'json');
  }

  private getContext(): LogContext {
    const correlationContext = correlationStorage.getStore();
    return {
      correlationId: correlationContext?.correlationId,
      requestId: correlationContext?.requestId,
      userId: correlationContext?.userId,
      timestamp: new Date().toISOString(),
    };
  }

  private formatLog(level: string, message: string, context?: LogContext): any {
    const baseContext = this.getContext();
    const fullContext = { ...baseContext, ...context };

    if (this.logFormat === 'json') {
      return {
        level,
        message,
        ...fullContext,
      };
    }

    return `[${level.toUpperCase()}] ${fullContext.timestamp} ${fullContext.correlationId || 'N/A'} - ${message}`;
  }

  log(message: string, context?: LogContext): void {
    const logData = this.formatLog('info', message, context);
    this.logger.log(logData);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext = {
      ...context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
    };
    const logData = this.formatLog('error', message, errorContext);
    this.logger.error(logData);
  }

  warn(message: string, context?: LogContext): void {
    const logData = this.formatLog('warn', message, context);
    this.logger.warn(logData);
  }

  debug(message: string, context?: LogContext): void {
    const logData = this.formatLog('debug', message, context);
    this.logger.debug(logData);
  }

  verbose(message: string, context?: LogContext): void {
    const logData = this.formatLog('verbose', message, context);
    this.logger.verbose(logData);
  }

  // Audit logging for important business events
  audit(event: string, details: any, context?: LogContext): void {
    const auditContext = {
      ...context,
      eventType: 'audit',
      event,
      details,
    };
    const logData = this.formatLog('info', `Audit: ${event}`, auditContext);
    this.logger.log(logData);
  }

  // Performance logging
  performance(operation: string, duration: number, context?: LogContext): void {
    const perfContext = {
      ...context,
      eventType: 'performance',
      operation,
      duration: `${duration}ms`,
    };
    const logData = this.formatLog('info', `Performance: ${operation}`, perfContext);
    this.logger.log(logData);
  }

  // Security logging
  security(event: string, details: any, context?: LogContext): void {
    const securityContext = {
      ...context,
      eventType: 'security',
      event,
      details,
    };
    const logData = this.formatLog('warn', `Security: ${event}`, securityContext);
    this.logger.warn(logData);
  }
}