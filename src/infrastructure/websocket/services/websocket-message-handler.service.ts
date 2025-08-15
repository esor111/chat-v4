import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { MessagePayload, ServerToClientEvents } from '../types/websocket-events.types';
import { ConversationAccessService } from './conversation-access.service';
import { InputSanitizationService } from './input-sanitization.service';
import { RateLimitingService } from './rate-limiting.service';
import { WebSocketErrorService } from './websocket-error.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: {
    id: string;
    name?: string;
  };
}

@Injectable()
export class WebSocketMessageHandlerService {
  private readonly logger = new Logger(WebSocketMessageHandlerService.name);

  constructor(
    private readonly accessService: ConversationAccessService,
    private readonly sanitizationService: InputSanitizationService,
    private readonly rateLimitingService: RateLimitingService,
    private readonly errorService: WebSocketErrorService,
  ) {}

  /**
   * Validate message request
   */
  async validateMessageRequest(
    client: AuthenticatedSocket,
    data: MessagePayload
  ): Promise<{ isValid: boolean; error?: string; sanitizedContent?: string }> {
    const { conversation_id, content } = data;

    // Check rate limiting
    if (!this.rateLimitingService.isWithinLimit(client.userId, 'message')) {
      return {
        isValid: false,
        error: 'Rate limit exceeded. Please slow down.',
      };
    }

    // Validate input
    if (!conversation_id || !content || content.trim().length === 0) {
      return {
        isValid: false,
        error: 'Invalid message data: conversation_id and content are required',
      };
    }

    // Sanitize content
    const sanitizedContent = this.sanitizationService.sanitizeMessageContent(content);
    if (!sanitizedContent) {
      return {
        isValid: false,
        error: 'Message content is invalid or empty after sanitization',
      };
    }

    // Check access permissions
    const accessResult = await this.accessService.canSendMessage(
      client.userId,
      conversation_id.toString()
    );
    if (!accessResult.allowed) {
      return {
        isValid: false,
        error: accessResult.reason || 'Access denied to this conversation',
      };
    }

    return {
      isValid: true,
      sanitizedContent,
    };
  }

  /**
   * Create fallback message object for testing
   */
  createFallbackMessage(
    client: AuthenticatedSocket,
    data: MessagePayload,
    sanitizedContent: string
  ) {
    return {
      message_id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversation_id: data.conversation_id,
      sender_id: client.userId,
      sender_name: client.user?.name,
      content: sanitizedContent,
      message_type: data.message_type || 'text',
      sent_at: new Date().toISOString(),
    };
  }

  /**
   * Send error response to client
   */
  sendMessageError(
    client: AuthenticatedSocket,
    error: string,
    conversationId?: string
  ): void {
    client.emit('message_error', {
      message: error,
      conversation_id: conversationId || 'unknown',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send success confirmation to client
   */
  sendMessageConfirmation(
    client: AuthenticatedSocket,
    messageId: string,
    conversationId: string,
    sentAt: string | Date
  ): void {
    client.emit('message_sent', {
      message_id: messageId,
      conversation_id: conversationId,
      sent_at: typeof sentAt === 'string' ? sentAt : sentAt.toISOString(),
      status: 'delivered' as const,
    });
  }
}