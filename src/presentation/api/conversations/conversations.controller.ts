import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
  Inject,
} from "@nestjs/common";
import { CurrentUser } from "@infrastructure/auth/decorators/current-user.decorator";
import {
  ApiTags,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "@infrastructure/auth/guards/jwt-auth.guard";
import { IConversationRepository } from "@domain/repositories/conversation.repository.interface";
import { IParticipantRepository } from "@domain/repositories/participant.repository.interface";
import { IMessageRepository } from "@domain/repositories/message.repository.interface";
import { SimpleProfileCacheService } from "@infrastructure/profile/simple-profile-cache.service";
import { WebSocketMessageService } from "@application/services/websocket-message.service";
import { ConversationService } from "@application/services/conversation.service";
import { 
  SendMessageDto, 
  CreateDirectConversationDto,
  PaginationQueryDto,
  MessagePaginationQueryDto 
} from "./dto/conversation.dto";

@ApiTags("conversations")
@Controller("api/conversations")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("JWT-auth")
export class ConversationsController {
  constructor(
    @Inject("IConversationRepository")
    private readonly conversationRepository: IConversationRepository,
    @Inject("IParticipantRepository")
    private readonly participantRepository: IParticipantRepository,
    @Inject("IMessageRepository")
    private readonly messageRepository: IMessageRepository,
    private readonly profileService: SimpleProfileCacheService,
    private readonly messageService: WebSocketMessageService,
    private readonly conversationService: ConversationService
  ) {}

  /**
   * Get user's conversations (chat list)
   */
  @Get()
  async getConversations(
    @CurrentUser() user: any,
    @Query() query: PaginationQueryDto
  ) {
    try {
      const userId = user.userId;
      const limitNum = query.limit ? parseInt(query.limit, 10) : 20;
      const offsetNum = query.offset ? parseInt(query.offset, 10) : 0;

      return await this.conversationService.getUserConversations(userId, limitNum, offsetNum);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        "Failed to fetch conversations",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get conversation details
   */
  @Get(":id")
  async getConversation(
    @Param("id") conversationId: string,
    @CurrentUser() user: any
  ) {
    try {
      const userId = user.userId;
      return await this.conversationService.getConversationDetails(conversationId, userId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        "Failed to fetch conversation",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get conversation messages
   */
  @Get(":id/messages")
  async getMessages(
    @Param("id") conversationId: string,
    @CurrentUser() user: any,
    @Query() query: MessagePaginationQueryDto
  ) {
    try {
      const userId = user.userId;
      const convId = conversationId;
      const limitNum = query.limit ? parseInt(query.limit, 10) : 50;
      const beforeId = query.before_message_id || undefined;

      // Check if user is participant
      const participant =
        await this.participantRepository.findByConversationAndUser(
          convId,
          userId
        );

      if (!participant) {
        throw new HttpException(
          "Conversation not found or access denied",
          HttpStatus.NOT_FOUND
        );
      }

      // Get messages
      const messages = await this.messageRepository.findByConversation(
        convId,
        limitNum,
        beforeId
      );

      // Get sender profiles
      const senderIds = [...new Set(messages.map((m) => m.senderId))];
      const profiles = await this.profileService.getBatchProfiles({
        user_ids: senderIds,
      });

      // Build message response
      const messagesWithSenders = messages.map((message) => {
        const senderProfile =
          profiles.users.find((u) => u.id === message.senderId) ||
          profiles.businesses.find((b) => b.id === message.senderId);

        return {
          message_id: message.id,
          conversation_id: message.conversationId,
          sender_id: message.senderId,
          sender_name: senderProfile?.name || "Unknown User",
          sender_avatar: senderProfile?.avatar_url,
          content: message.content.content,
          message_type: message.type.value,
          sent_at: message.sentAt,
          is_deleted: !!message.deletedAt,
        };
      });

      return {
        messages: messagesWithSenders,
        has_more: messages.length === limitNum,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        "Failed to fetch messages",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Send message to conversation
   */
  @Post(":id/messages")
  async sendMessage(
    @Param("id") conversationId: string,
    @Body() sendMessageDto: SendMessageDto,
    @CurrentUser() user: any
  ) {
    try {
      const userId = user.userId;
      const convId = conversationId;

      const result = await this.messageService.sendMessage({
        senderId: userId,
        conversationId: convId,
        content: sendMessageDto.content,
        messageType: sendMessageDto.message_type || "text",
      });

      if (!result.success) {
        throw new HttpException(
          result.error || "Failed to send message",
          HttpStatus.BAD_REQUEST
        );
      }

      return {
        message: result.message,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        "Failed to send message",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Create direct conversation
   */
  @Post('direct')
  async createDirectConversation(
    @Body() createDirectDto: CreateDirectConversationDto,
    @CurrentUser() user: any,
  ) {
    try {
      const userId = user.userId;
      const targetUserId = createDirectDto.target_user_id;

      const result = await this.conversationService.createDirectConversation(userId, targetUserId);
      
      return {
        ...result,
        message: 'Direct conversation created successfully',
      };

    } catch (error) {
      console.error('Failed to create direct conversation:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to create direct conversation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Create group conversation
   */
  @Post('group')
  async createGroupConversation(
    @Body() body: { name: string; participants: string[] },
    @CurrentUser() user: any,
  ) {
    try {
      const userId = user.userId;
      const { participants } = body;

      if (!participants || participants.length === 0) {
        throw new HttpException(
          'At least one participant is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (participants.length > 7) {
        throw new HttpException(
          'Maximum 7 participants allowed (8 total including creator)',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Create group conversation
      const conversation = await this.conversationRepository.save({
        type: { value: 'group' },
        createdAt: new Date(),
        lastActivity: new Date(),
      } as any);

      // Add creator as admin
      await this.participantRepository.save({
        conversationId: conversation.id,
        userId: userId,
        role: { value: 'admin' },
        isMuted: false,
      } as any);

      // Add other participants as members
      for (const participantId of participants) {
        await this.participantRepository.save({
          conversationId: conversation.id,
          userId: participantId,
          role: { value: 'member' },
          isMuted: false,
        } as any);
      }

      return {
        conversation_id: conversation.id,
        message: 'Group conversation created successfully',
      };

    } catch (error) {
      console.error('Failed to create group conversation:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to create group conversation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Mark messages as read
   */
  @Post(":id/read")
  async markAsRead(
    @Param("id") conversationId: string,
    @Body() body: { message_id: string },
    @CurrentUser() user: any
  ) {
    try {
      const userId = user.userId;
      const convId = conversationId;

      await this.messageService.markMessagesAsRead(
        userId,
        convId,
        body.message_id
      );

      return {
        success: true,
        message: "Messages marked as read",
      };
    } catch (error) {
      throw new HttpException(
        "Failed to mark messages as read",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
