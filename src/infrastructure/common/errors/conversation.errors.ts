import { HttpException, HttpStatus } from '@nestjs/common';

export class ConversationNotFoundError extends HttpException {
  constructor(conversationId: string) {
    super(`Conversation with ID ${conversationId} not found`, HttpStatus.NOT_FOUND);
  }
}

export class ConversationAccessDeniedError extends HttpException {
  constructor(conversationId: string) {
    super(`Access denied to conversation ${conversationId}`, HttpStatus.FORBIDDEN);
  }
}

export class InvalidParticipantCountError extends HttpException {
  constructor(count: number, maxAllowed: number) {
    super(
      `Invalid participant count: ${count}. Maximum ${maxAllowed} participants allowed`,
      HttpStatus.BAD_REQUEST
    );
  }
}

export class UserNotFoundError extends HttpException {
  constructor(userId: string) {
    super(`User with ID ${userId} not found`, HttpStatus.NOT_FOUND);
  }
}

export class SelfConversationError extends HttpException {
  constructor() {
    super('Cannot create conversation with yourself', HttpStatus.BAD_REQUEST);
  }
}