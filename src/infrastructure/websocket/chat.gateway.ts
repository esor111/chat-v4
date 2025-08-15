import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Logger, UseGuards } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { WsJwtGuard } from "./guards/ws-jwt.guard";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  MessagePayload,
  JoinRoomPayload,
  TypingPayload,
  MarkAsReadPayload,
} from "./types/websocket-events.types";
import { WebSocketConnectionService } from "./services/websocket-connection.service";
import { WebSocketBroadcastService } from "./services/websocket-broadcast.service";
import { ConversationAccessService } from "./services/conversation-access.service";
import { WebSocketErrorService } from "./services/websocket-error.service";
import { InputSanitizationService } from "./services/input-sanitization.service";
import { RateLimitingService } from "./services/rate-limiting.service";
import { WebSocketMessageHandlerService } from "./services/websocket-message-handler.service";

interface AuthenticatedSocket extends Socket<ClientToServerEvents, ServerToClientEvents> {
  userId?: string;
  user?: {
    id: string;
    name?: string;
  };
}

@WebSocketGateway({
  cors: {
    origin: "*", // Configure this properly for production
    methods: ["GET", "POST"],
    credentials: true,
  },
  namespace: "/chat",
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private messageService: any; // Will be injected later to avoid circular dependency

  constructor(
    private readonly connectionService: WebSocketConnectionService,
    private readonly broadcastService: WebSocketBroadcastService,
    private readonly accessService: ConversationAccessService,
    private readonly errorService: WebSocketErrorService,
    private readonly sanitizationService: InputSanitizationService,
    private readonly rateLimitingService: RateLimitingService,
    private readonly messageHandlerService: WebSocketMessageHandlerService,
  ) {}

  afterInit(server: Server) {
    this.broadcastService.setServer(server);
    this.logger.log("WebSocket Gateway initialized");

    // Set up periodic cleanup for rate limiting
    setInterval(() => {
      this.rateLimitingService.cleanup();
    }, 300000); // Clean up every 5 minutes
  }

  /**
   * Set message service (to avoid circular dependency)
   */
  setMessageService(messageService: any): void {
    this.messageService = messageService;
    this.logger.log("Message service injected into WebSocket Gateway");
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      this.logger.log(`Client attempting to connect: ${client.id}`);

      const authenticated = await this.connectionService.authenticateSocket(client);
      if (!authenticated) {
        client.disconnect();
        return;
      }

      // Send connection confirmation
      client.emit("connected", {
        message: "Successfully connected to chat",
        userId: client.userId,
      });

      // Deliver offline messages if message service is available
      if (this.messageService) {
        try {
          await this.messageService.deliverOfflineMessages(client.userId);
        } catch (error) {
          this.logger.warn('Failed to deliver offline messages', { error: error.message, userId: client.userId });
        }
      }
    } catch (error) {
      this.logger.error(`Connection error for client ${client.id}:`, error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.connectionService.disconnectUser(client);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("join_conversation")
  async handleJoinConversation(
    @MessageBody() data: JoinRoomPayload,
    @ConnectedSocket() client: AuthenticatedSocket
  ) {
    try {
      const { conversation_id } = data;
      const roomName = `conversation_${conversation_id}`;

      // Validate user can access this conversation
      const accessResult = await this.accessService.validateAccess(client.userId, conversation_id.toString());
      if (!accessResult.allowed) {
        client.emit("join_error", {
          message: accessResult.reason || "Access denied to this conversation",
          conversation_id,
        });
        return;
      }

      // Join the conversation room
      await client.join(roomName);

      this.logger.log(
        `User ${client.userId} joined conversation ${conversation_id}`
      );

      // Notify user they joined successfully
      client.emit("joined_conversation", {
        conversation_id,
        message: `Joined conversation ${conversation_id}`,
        timestamp: new Date().toISOString(),
      });

      // Notify other participants that user joined (optional)
      client.to(roomName).emit("user_joined_conversation", {
        conversation_id,
        user_id: client.userId,
        user_name: client.user?.name,
        timestamp: new Date().toISOString(),
      });

      // Send recent messages to the user
      if (this.messageService) {
        try {
          const recentMessages = await this.messageService.getRecentMessages(conversation_id.toString(), 20);
          client.emit("conversation_history", {
            conversation_id,
            messages: recentMessages.messages,
          });
        } catch (error) {
          this.logger.warn(`Failed to load recent messages for conversation ${conversation_id}:`, error);
        }
      }
    } catch (error) {
      this.logger.error(`Error joining conversation:`, error);
      client.emit("join_error", {
        message: "Failed to join conversation",
        conversation_id: data.conversation_id,
      });
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("leave_conversation")
  async handleLeaveConversation(
    @MessageBody() data: JoinRoomPayload,
    @ConnectedSocket() client: AuthenticatedSocket
  ) {
    try {
      const { conversation_id } = data;
      const roomName = `conversation_${conversation_id}`;

      // Leave the conversation room
      await client.leave(roomName);

      this.logger.log(
        `User ${client.userId} left conversation ${conversation_id}`
      );

      // Notify user they left successfully
      client.emit("left_conversation", {
        conversation_id,
        message: `Left conversation ${conversation_id}`,
      });
    } catch (error) {
      this.logger.error(`Error leaving conversation:`, error);
      client.emit("error", {
        message: "Failed to leave conversation",
        error: error.message,
      });
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("send_message")
  async handleMessage(
    @MessageBody() data: MessagePayload,
    @ConnectedSocket() client: AuthenticatedSocket
  ) {
    try {
      // Validate message request
      const validation = await this.messageHandlerService.validateMessageRequest(client, data);
      if (!validation.isValid) {
        this.messageHandlerService.sendMessageError(client, validation.error, data.conversation_id);
        return;
      }

      if (!this.messageService) {
        // Fallback to simple broadcasting without persistence
        return this.handleMessageFallback(data, client, validation.sanitizedContent);
      }

      // Use message service for validation, persistence, and broadcasting
      const result = await this.messageService.sendMessage({
        senderId: client.userId,
        conversationId: data.conversation_id.toString(),
        content: data.content,
        messageType: data.message_type || 'text',
      });

      if (result.success) {
        this.messageHandlerService.sendMessageConfirmation(
          client,
          result.message.messageId,
          result.message.conversationId,
          result.message.sentAt
        );

        this.logger.log(`Message sent successfully by user ${client.userId} to conversation ${data.conversation_id}`);
      } else {
        this.messageHandlerService.sendMessageError(client, result.error || "Failed to send message", data.conversation_id);
      }
    } catch (error) {
      this.logger.error(`Error handling message:`, error);
      this.errorService.handleError(client, error, 'send_message');
    }
  }

  /**
   * Fallback message handling without persistence (for testing)
   */
  private async handleMessageFallback(
    data: MessagePayload,
    client: AuthenticatedSocket,
    sanitizedContent: string
  ) {
    // Create message object without database storage
    const message = this.messageHandlerService.createFallbackMessage(client, data, sanitizedContent);
    const roomName = `conversation_${data.conversation_id}`;

    this.logger.log(
      `User ${client.userId} sent message to conversation ${data.conversation_id} (fallback mode)`
    );

    // Broadcast message to all participants in the conversation
    this.server.to(roomName).emit("new_message", message);

    // Send confirmation to sender
    this.messageHandlerService.sendMessageConfirmation(
      client,
      message.message_id,
      message.conversation_id,
      message.sent_at
    );
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("typing_start")
  async handleTypingStart(
    @MessageBody() data: TypingPayload,
    @ConnectedSocket() client: AuthenticatedSocket
  ) {
    try {
      const { conversation_id } = data;

      // Check rate limiting for typing events
      if (!this.rateLimitingService.isWithinLimit(client.userId, 'typing')) {
        return; // Silently ignore excessive typing events
      }

      const roomName = `conversation_${conversation_id}`;

      // Broadcast typing indicator to other participants (not sender)
      client.to(roomName).emit("user_typing", {
        conversation_id,
        user_id: client.userId,
        user_name: client.user?.name,
        is_typing: true,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(
        `User ${client.userId} started typing in conversation ${conversation_id}`
      );
    } catch (error) {
      this.logger.error(`Error handling typing start:`, error);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("typing_stop")
  async handleTypingStop(
    @MessageBody() data: TypingPayload,
    @ConnectedSocket() client: AuthenticatedSocket
  ) {
    try {
      const { conversation_id } = data;
      const roomName = `conversation_${conversation_id}`;

      // Broadcast typing stop to other participants (not sender)
      client.to(roomName).emit("user_typing", {
        conversation_id,
        user_id: client.userId,
        user_name: client.user?.name,
        is_typing: false,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(
        `User ${client.userId} stopped typing in conversation ${conversation_id}`
      );
    } catch (error) {
      this.logger.error(`Error handling typing stop:`, error);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("mark_as_read")
  async handleMarkAsRead(
    @MessageBody() data: MarkAsReadPayload,
    @ConnectedSocket() client: AuthenticatedSocket
  ) {
    try {
      const { conversation_id, message_id } = data;

      if (this.messageService) {
        await this.messageService.markMessagesAsRead(
          client.userId,
          conversation_id.toString(),
          message_id
        );

        // Notify other participants about read status
        const roomName = `conversation_${conversation_id}`;
        client.to(roomName).emit("message_read", {
          conversation_id,
          user_id: client.userId,
          message_id,
          timestamp: new Date().toISOString(),
        });

        client.emit("marked_as_read", {
          conversation_id,
          message_id,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.logger.error(`Error marking messages as read:`, error);
      client.emit("error", {
        message: "Failed to mark messages as read",
        error: error.message,
      });
    }
  }

  /**
   * Send message to specific user (for offline message delivery)
   */
  async sendMessageToUser(
    userId: string,
    event: keyof ServerToClientEvents,
    data: any
  ): Promise<boolean> {
    return this.broadcastService.sendMessageToUser(userId, event, data);
  }

  /**
   * Send message to conversation room
   */
  async sendMessageToConversation(
    conversationId: string,
    event: keyof ServerToClientEvents,
    data: any
  ): Promise<void> {
    return this.broadcastService.sendMessageToConversation(conversationId, event, data);
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount(): number {
    return this.connectionService.getConnectedUsersCount();
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId: string): boolean {
    return this.connectionService.isUserConnected(userId);
  }

  /**
   * Get user's socket count
   */
  getUserSocketCount(userId: string): number {
    return this.connectionService.getUserSocketCount(userId);
  }


}
