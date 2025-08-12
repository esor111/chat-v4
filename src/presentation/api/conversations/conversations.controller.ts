import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
  Inject,
} from '@nestjs/common';
import { JwtAuthGuard } from '@infrastructure/auth/guards/jwt-auth.guard';
import { IConversationRepository } from '@domain/repositories/conversation.repository.interface';
import { IParticipantRepository } from '@domain/repositories/participant.repository.interface';
import { IMessageRepository } from '@domain/repositories/message.repository.interface';
import { SimpleProfileCacheService } from '@infrastructure/profile/simple-profile-cache.service';
import { WebSocketMessageService } from '@application/services/websocket-message.service';
import { CreateConversationDto, SendMessageDto } from './dto/conversation.dto';

@Controller('api/conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(
    @Inject('IConversationRepository')
    private readonly conversationRepository: IConversationRepository,
    @Inject('IParticipantRepository')
    private readonly participantRepository: IParticipantRepository,
    @Inject('IMessageRepository')
    private readonly messageRepository: IMessageRepository,
    private readonly profileService: SimpleProfileCacheService,
    private readonly messageService: WebSocketMessageService,
  ) {}

  /**
   * Get user's conversations (chat list)
   */
  @Get()
  async getConversations(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      const userId = req.user.sub;
      const limitNum = limit ? parseInt(limit, 10) : 20;
      const offsetNum = offset ? parseInt(offset, 10) : 0;

      // Get user's conversations
      const participants = await this.participantRepository.findByUser(userId);
      const conversationIds = participants.map(p => p.conversationId);

      if (conversationIds.length === 0) {
        return {
          conversations: [],
          total: 0,
        };
      }

      // Get conversations with pagination
      const conversations = await this.conversationRepository.findByIds(
        conversationIds,
        { limit: limitNum, offset: offsetNum }
      );

      // Get all participants for these conversations
      const allParticipants = await Promise.all(
        conversations.map(conv => 
          this.participantRepository.findByConversation(conv.id)
        )
      );

      // Get unique user IDs for profile fetching
      const userIds = new Set<number>();
      allParticipants.flat().forEach(p => userIds.add(p.userId));

      // Fetch profiles
      const profiles = await this.profileService.getBatchProfiles({
        user_ids: Array.from(userIds),
      });

      // Build response
      const conversationsWithDetails = conversations.map((conversation, index) => {
        const convParticipants = allParticipants[index];
        const otherParticipants = convParticipants.filter(p => p.userId !== userId);
        
        // Get profile info for other participants
        const participantProfiles = otherParticipants.map(p => {
          const profile = profiles.users.find(u => u.id === p.userId) ||
                         profiles.businesses.find(b => b.id === p.userId);
          return {
            userId: p.userId,
            role: p.role.value,
            name: profile?.name || 'Unknown User',
            avatar_url: profile?.avatar_url,
            user_type: profile?.user_type || 'user',
          };
        });

        const userParticipant = convParticipants.find(p => p.userId === userId);

        return {
          conversation_id: conversation.id,
          type: conversation.type.value,
          last_activity: conversation.lastActivity,
          last_message_id: conversation.lastMessageId,
          participants: participantProfiles,
          unread_count: 0, // TODO: Calculate unread count
          is_muted: userParticipant?.isMuted || false,
        };
      });

      return {
        conversations: conversationsWithDetails,
        total: conversationIds.length,
      };

    } catch (error) {
      throw new HttpException(
        'Failed to fetch conversations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get conversation details
   */
  @Get(':id')
  async getConversation(
    @Param('id') conversationId: string,
    @Request() req: any,
  ) {
    try {
      const userId = req.user.sub;
      const convId = parseInt(conversationId, 10);

      // Check if user is participant
      const participant = await this.participantRepository.findByConversationAndUser(
        convId,
        userId
      );

      if (!participant) {
        throw new HttpException(
          'Conversation not found or access denied',
          HttpStatus.NOT_FOUND,
        );
      }

      // Get conversation
      const conversation = await this.conversationRepository.findById(convId);
      if (!conversation) {
        throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
      }

      // Get all participants
      const participants = await this.participantRepository.findByConversation(convId);
      const userIds = participants.map(p => p.userId);

      // Fetch profiles
      const profiles = await this.profileService.getBatchProfiles({
        user_ids: userIds,
      });

      // Build participant details
      const participantDetails = participants.map(p => {
        const profile = profiles.users.find(u => u.id === p.userId) ||
                       profiles.businesses.find(b => b.id === p.userId);
        return {
          userId: p.userId,
          role: p.role.value,
          name: profile?.name || 'Unknown User',
          avatar_url: profile?.avatar_url,
          user_type: profile?.user_type || 'user',
          is_muted: p.isMuted,
          last_read_message_id: p.lastReadMessageId,
        };
      });

      return {
        conversation_id: conversation.id,
        type: conversation.type.value,
        created_at: conversation.createdAt,
        last_activity: conversation.lastActivity,
        last_message_id: conversation.lastMessageId,
        participants: participantDetails,
      };

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch conversation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get conversation messages
   */
  @Get(':id/messages')
  async getMessages(
    @Param('id') conversationId: string,
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('before_message_id') beforeMessageId?: string,
  ) {
    try {
      const userId = req.user.sub;
      const convId = parseInt(conversationId, 10);
      const limitNum = limit ? parseInt(limit, 10) : 50;
      const beforeId = beforeMessageId ? parseInt(beforeMessageId, 10) : undefined;

      // Check if user is participant
      const participant = await this.participantRepository.findByConversationAndUser(
        convId,
        userId
      );

      if (!participant) {
        throw new HttpException(
          'Conversation not found or access denied',
          HttpStatus.NOT_FOUND,
        );
      }

      // Get messages
      const messages = await this.messageRepository.findByConversation(
        convId,
        limitNum,
        beforeId
      );

      // Get sender profiles
      const senderIds = [...new Set(messages.map(m => m.senderId))];
      const profiles = await this.profileService.getBatchProfiles({
        user_ids: senderIds,
      });

      // Build message response
      const messagesWithSenders = messages.map(message => {
        const senderProfile = profiles.users.find(u => u.id === message.senderId) ||
                             profiles.businesses.find(b => b.id === message.senderId);

        return {
          message_id: message.id,
          conversation_id: message.conversationId,
          sender_id: message.senderId,
          sender_name: senderProfile?.name || 'Unknown User',
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
        'Failed to fetch messages',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Send message to conversation
   */
  @Post(':id/messages')
  async sendMessage(
    @Param('id') conversationId: string,
    @Body() sendMessageDto: SendMessageDto,
    @Request() req: any,
  ) {
    try {
      const userId = req.user.sub;
      const convId = parseInt(conversationId, 10);

      const result = await this.messageService.sendMessage({
        senderId: userId,
        conversationId: convId,
        content: sendMessageDto.content,
        messageType: sendMessageDto.message_type || 'text',
      });

      if (!result.success) {
        throw new HttpException(
          result.error || 'Failed to send message',
          HttpStatus.BAD_REQUEST,
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
        'Failed to send message',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Create new conversation
   */
  @Post()
  async createConversation(
    @Body() createConversationDto: CreateConversationDto,
    @Request() req: any,
  ) {
    try {
      const userId = req.user.sub;

      // TODO: Implement conversation creation logic
      // This would involve creating the conversation and adding participants
      
      throw new HttpException(
        'Conversation creation not yet implemented',
        HttpStatus.NOT_IMPLEMENTED,
      );

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to create conversation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Mark messages as read
   */
  @Post(':id/read')
  async markAsRead(
    @Param('id') conversationId: string,
    @Body() body: { message_id: number },
    @Request() req: any,
  ) {
    try {
      const userId = req.user.sub;
      const convId = parseInt(conversationId, 10);

      await this.messageService.markMessagesAsRead(
        userId,
        convId,
        body.message_id
      );

      return {
        success: true,
        message: 'Messages marked as read',
      };

    } catch (error) {
      throw new HttpException(
        'Failed to mark messages as read',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}