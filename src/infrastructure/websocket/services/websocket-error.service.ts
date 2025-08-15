import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';

export interface WebSocketError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

@Injectable()
export class WebSocketErrorService {
  private readonly logger = new Logger(WebSocketErrorService.name);

  /**
   * Handle and emit standardized errors to client
   */
  handleError(socket: Socket, error: any, context?: string): void {
    const wsError = this.createWebSocketError(error, context);
    
    this.logger.error(`WebSocket error in ${context || 'unknown context'}:`, {
      error: wsError,
      socketId: socket.id,
      userId: (socket as any).userId,
    });

    socket.emit('error', wsError);
  }

  /**
   * Create standardized WebSocket error object
   */
  private createWebSocketError(error: any, context?: string): WebSocketError {
    let code = 'UNKNOWN_ERROR';
    let message = 'An unexpected error occurred';

    if (error instanceof Error) {
      message = error.message;
      
      // Map specific error types to codes
      if (error.name === 'ValidationError') {
        code = 'VALIDATION_ERROR';
      } else if (error.name === 'UnauthorizedError') {
        code = 'UNAUTHORIZED';
      } else if (error.message.includes('not found')) {
        code = 'NOT_FOUND';
      } else if (error.message.includes('permission')) {
        code = 'PERMISSION_DENIED';
      }
    } else if (typeof error === 'string') {
      message = error;
    }

    return {
      code,
      message,
      details: context ? { context } : undefined,
      timestamp: new Date().toISOString(),
    };
  }
}