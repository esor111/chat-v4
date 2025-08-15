import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { IConversationRepository } from "@domain/repositories/conversation.repository.interface";
import { IParticipantRepository } from "@domain/repositories/participant.repository.interface";
import { IMessageRepository } from "@domain/repositories/message.repository.interface";
import { SimpleProfileCacheService } from "@infrastructure/profile/simple-profile-cache.service";

export interface ConversationListItem {
  conversation_id: string;
  type: string;
  last_activity: Date;
  last_message_id?: string;
  participants: Array<{
    userId: string;
    role: string;
    name: string;
    avatar_url?: string;
    user_type: string;
  }>;
  unread_count: number;
  is_muted: boolean;
}

export interface ConversationDetails {
  conversation_id: string;
  type: string;
  created_at: Date;
  last_activity: Date;
  last_message_id?: string;
  participants: Array<{
    userId: string;
    role: string;
    name: string;
    avatar_url?: string;
    user_type: string;
    is_muted: boolean;
    last_read_message_id?: string;
  }>;
}

export interface MessageWithSender {
  message_id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  content: string;
  message_type: string;
  sent_at: Date;
  is_deleted: boolean;
}

@Injectable()
export class ConversationService {
  constructor(
    @Inject("IConversationRepository")
    private readonly conversationRepository: IConversationRepository,
    @Inject("IParticipantRepository")
    private readonly participantRepository: IParticipantRepository,
    @Inject("IMessageRepository")
    private readonly messageRepository: IMessageRepository,
    private readonly profileService: SimpleProfileCacheService
  ) {}

  async getUserConversations(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ conversations: ConversationListItem[]; total: number }> {
    const conversations = await this.conversationRepository.findByParticipant(userId, limit + offset, 0);

    const conversationsWithDetails = await this.enrichConversationsWithProfiles(conversations, userId);

    // Apply pagination and sorting
    const paginatedConversations = conversationsWithDetails
      .sort((a, b) => b.last_activity.getTime() - a.last_activity.getTime())
      .slice(offset, offset + limit);

    return {
      conversations: paginatedConversations,
      total: conversations.length,
    };
  }

  private async enrichConversationsWithProfiles(
    conversations: any[],
    currentUserId: string
  ): Promise<ConversationListItem[]> {
    const allParticipants = await this.fetchAllParticipants(conversations);
    const profiles = await this.fetchProfilesForParticipants(allParticipants);

    return conversations.map((conversation, index) => 
      this.buildConversationListItem(conversation, allParticipants[index], profiles, currentUserId)
    );
  }

  private async fetchAllParticipants(conversations: any[]): Promise<any[][]> {
    return Promise.all(
      conversations.map((conv) =>
        this.participantRepository.findByConversation(conv.id)
      )
    );
  }

  private async fetchProfilesForParticipants(allParticipants: any[][]): Promise<any> {
    const userIds = new Set<string>();
    allParticipants.flat().forEach((p) => userIds.add(p.userId));

    return this.profileService.getBatchProfiles({
      user_ids: Array.from(userIds),
    });
  }

  private buildConversationListItem(
    conversation: any,
    participants: any[],
    profiles: any,
    currentUserId: string
  ): ConversationListItem {
    const otherParticipants = participants.filter((p) => p.userId !== currentUserId);
    const participantProfiles = this.mapParticipantProfiles(otherParticipants, profiles);
    const userParticipant = participants.find((p) => p.userId === currentUserId);

    return {
      conversation_id: conversation.id,
      type: conversation.type.value,
      last_activity: conversation.lastActivity,
      last_message_id: conversation.lastMessageId,
      participants: participantProfiles,
      unread_count: 0, // TODO: Calculate unread count
      is_muted: userParticipant?.isMuted || false,
    };
  }

  private mapParticipantProfiles(participants: any[], profiles: any): any[] {
    return participants.map((p) => {
      const profile = this.findProfileById(p.userId, profiles);
      return {
        userId: p.userId,
        role: p.role.value,
        name: profile?.name || "Unknown User",
        avatar_url: profile?.avatar_url,
        user_type: profile?.user_type || "user",
      };
    });
  }

  private findProfileById(userId: string, profiles: any): any {
    return profiles.users.find((u: any) => u.id === userId) ||
           profiles.businesses.find((b: any) => b.id === userId);
  }

  async getConversationDetails(
    conversationId: string,
    userId: string
  ): Promise<ConversationDetails> {
    await this.validateUserAccess(conversationId, userId);

    const conversation = await this.conversationRepository.findById(
      conversationId
    );
    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    const participants = await this.participantRepository.findByConversation(
      conversationId
    );
    const userIds = participants.map((p) => p.userId);

    const profiles = await this.profileService.getBatchProfiles({
      user_ids: userIds,
    });

    const participantDetails = participants.map((p) => {
      const profile =
        profiles.users.find((u) => u.id === p.userId) ||
        profiles.businesses.find((b) => b.id === p.userId);
      return {
        userId: p.userId,
        role: p.role.value,
        name: profile?.name || "Unknown User",
        avatar_url: profile?.avatar_url,
        user_type: profile?.user_type || "user",
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
  }

  async getConversationMessages(
    conversationId: string,
    userId: string,
    limit: number = 50,
    beforeId?: string
  ): Promise<{ messages: MessageWithSender[]; has_more: boolean }> {
    await this.validateUserAccess(conversationId, userId);

    const messages = await this.messageRepository.findByConversation(
      conversationId,
      limit,
      beforeId
    );

    const senderIds = [...new Set(messages.map((m) => m.senderId))];
    const profiles = await this.profileService.getBatchProfiles({
      user_ids: senderIds,
    });

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
      has_more: messages.length === limit,
    };
  }

  async createDirectConversation(
    userId: string,
    targetUserId: string
  ): Promise<{ conversation_id: string }> {
    this.validateDirectConversationRequest(userId, targetUserId);

    await this.validateTargetUserExists(targetUserId);

    // Check if direct conversation already exists
    // TODO: Implement findDirectConversation method

    const conversation = await this.conversationRepository.save({
      type: { value: "direct" },
      createdAt: new Date(),
      lastActivity: new Date(),
    } as any);

    await this.addDirectConversationParticipants(conversation.id, userId, targetUserId);

    return { conversation_id: conversation.id };
  }

  private validateDirectConversationRequest(userId: string, targetUserId: string): void {
    if (userId === targetUserId) {
      throw new BadRequestException("Cannot create conversation with yourself");
    }
  }

  private async validateTargetUserExists(targetUserId: string): Promise<void> {
    const targetProfile = await this.profileService.getUserProfile(targetUserId);
    if (!targetProfile) {
      throw new NotFoundException("Target user not found");
    }
  }

  private async addDirectConversationParticipants(
    conversationId: string,
    userId: string,
    targetUserId: string
  ): Promise<void> {
    await Promise.all([
      this.participantRepository.save({
        conversationId,
        userId,
        role: { value: "member" },
        isMuted: false,
      } as any),
      this.participantRepository.save({
        conversationId,
        userId: targetUserId,
        role: { value: "member" },
        isMuted: false,
      } as any),
    ]);
  }

  async createGroupConversation(
    userId: string,
    participants: string[]
  ): Promise<{ conversation_id: string }> {
    if (participants.length === 0) {
      throw new BadRequestException("At least one participant is required");
    }

    if (participants.length > 7) {
      throw new BadRequestException(
        "Maximum 7 participants allowed (8 total including creator)"
      );
    }

    // Validate all participants exist
    const profiles = await this.profileService.getBatchProfiles({
      user_ids: participants,
    });

    const existingUserIds = new Set([
      ...profiles.users.map((u) => u.id),
      ...profiles.businesses.map((b) => b.id),
    ]);

    const missingUsers = participants.filter((id) => !existingUserIds.has(id));
    if (missingUsers.length > 0) {
      throw new BadRequestException(
        `Users not found: ${missingUsers.join(", ")}`
      );
    }

    const conversation = await this.conversationRepository.save({
      type: { value: "group" },
      createdAt: new Date(),
      lastActivity: new Date(),
    } as any);

    // Add creator as admin
    await this.participantRepository.save({
      conversationId: conversation.id,
      userId: userId,
      role: { value: "admin" },
      isMuted: false,
    } as any);

    // Add other participants as members
    await Promise.all(
      participants.map((participantId) =>
        this.participantRepository.save({
          conversationId: conversation.id,
          userId: participantId,
          role: { value: "member" },
          isMuted: false,
        } as any)
      )
    );

    return { conversation_id: conversation.id };
  }

  private async validateUserAccess(
    conversationId: string,
    userId: string
  ): Promise<void> {
    const participant =
      await this.participantRepository.findByConversationAndUser(
        conversationId,
        userId
      );

    if (!participant) {
      throw new ForbiddenException("Access denied to this conversation");
    }
  }
}
