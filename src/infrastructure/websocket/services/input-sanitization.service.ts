import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class InputSanitizationService {
  private readonly logger = new Logger(InputSanitizationService.name);

  /**
   * Sanitize message content
   */
  sanitizeMessageContent(content: string): string {
    if (!content || typeof content !== 'string') {
      return '';
    }

    // Remove potential XSS vectors
    let sanitized = content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');

    // Trim and normalize whitespace
    sanitized = sanitized.trim().replace(/\s+/g, ' ');

    // Limit length
    if (sanitized.length > 4000) {
      sanitized = sanitized.substring(0, 4000);
    }

    return sanitized;
  }

  /**
   * Validate conversation ID format
   */
  isValidConversationId(conversationId: string): boolean {
    if (!conversationId || typeof conversationId !== 'string') {
      return false;
    }

    // UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(conversationId);
  }

  /**
   * Validate user ID format
   */
  isValidUserId(userId: string): boolean {
    return this.isValidConversationId(userId); // Same UUID format
  }
}