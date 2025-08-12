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
import { Logger, UseGuards, Inject, forwardRef } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { WsJwtGuard } from "./guards/ws-jwt.guard";

interface AuthenticatedSocket extends Socket {
  userId?: number;
  user?: {
    id: number;
    name?: string;
  };
}

interface MessagePayload {
  conversation_id: number;
  content: string;
  message_type?: string;
}

interface JoinRoomPayload {
  conversation_id: number;
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
  private readonly connectedUsers = new Map<number, AuthenticatedSocket[]>();
  private messageService: any; // Will be injected later to avoid circular dependency

  constructor(private readonly jwtService: JwtService) {}

  afterInit(server: Server) {
    this.logger.log("WebSocket Gateway initialized");
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

      // Extract token from handshake auth or query
      const token = this.extractTokenFromClient(client);

      if (!token) {
        this.logger.warn(`No token provided for client ${client.id}`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = await this.verifyToken(token);
      if (!payload) {
        this.logger.warn(`Invalid token for client ${client.id}`);
        client.disconnect();
        return;
      }

      // Attach user info to socket
      client.userId = payload.sub;
      client.user = {
        id: payload.sub,
        name: payload.name,
      };

      // Track connected user
      this.addUserConnection(client.userId, client);

      this.logger.log(
        `User ${client.userId} connected with socket ${client.id}`
      );

      // Send connection confirmation
      client.emit("connected", {
        message: "Successfully connected to chat",
        userId: client.userId,
      });

      // Deliver offline messages if message service is available
      if (this.messageService) {
        await this.messageService.deliverOfflineMessages(client.userId);
      }
    } catch (error) {
      this.logger.error(`Connection error for client ${client.id}:`, error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.removeUserConnection(client.userId, client);
      this.logger.log(
        `User ${client.userId} disconnected (socket ${client.id})`
      );
    } else {
      this.logger.log(`Unauthenticated client disconnected: ${client.id}`);
    }
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

      // Join the conversation room
      await client.join(roomName);

      this.logger.log(
        `User ${client.userId} joined conversation ${conversation_id}`
      );

      // Notify user they joined successfully
      client.emit("joined_conversation", {
        conversation_id,
        message: `Joined conversation ${conversation_id}`,
      });

      // Notify other participants that user joined (optional)
      client.to(roomName).emit("user_joined_conversation", {
        conversation_id,
        user_id: client.userId,
        user_name: client.user?.name,
      });
    } catch (error) {
      this.logger.error(`Error joining conversation:`, error);
      client.emit("error", {
        message: "Failed to join conversation",
        error: error.message,
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
      const { conversation_id, content, message_type = "text" } = data;

      if (!this.messageService) {
        // Fallback to simple broadcasting without persistence
        return this.handleMessageFallback(data, client);
      }

      // Use message service for validation, persistence, and broadcasting
      const result = await this.messageService.sendMessage({
        senderId: client.userId,
        conversationId: conversation_id,
        content,
        messageType: message_type,
      });

      if (result.success) {
        // Send confirmation to sender
        client.emit("message_sent", {
          message_id: result.message.messageId,
          conversation_id: result.message.conversationId,
          sent_at: result.message.sentAt,
        });
      } else {
        client.emit("error", {
          message: result.error || "Failed to send message",
        });
      }
    } catch (error) {
      this.logger.error(`Error handling message:`, error);
      client.emit("error", {
        message: "Failed to send message",
        error: error.message,
      });
    }
  }

  /**
   * Fallback message handling without persistence (for testing)
   */
  private async handleMessageFallback(
    data: MessagePayload,
    client: AuthenticatedSocket
  ) {
    const { conversation_id, content, message_type = "text" } = data;

    if (!content || content.trim().length === 0) {
      client.emit("error", {
        message: "Message content cannot be empty",
      });
      return;
    }

    // Create message object without database storage
    const message = {
      message_id: Date.now(), // Temporary ID
      conversation_id,
      sender_id: client.userId,
      sender_name: client.user?.name,
      content: content.trim(),
      message_type,
      sent_at: new Date().toISOString(),
    };

    const roomName = `conversation_${conversation_id}`;

    this.logger.log(
      `User ${client.userId} sent message to conversation ${conversation_id} (fallback mode)`
    );

    // Broadcast message to all participants in the conversation
    this.server.to(roomName).emit("new_message", message);

    // Send confirmation to sender
    client.emit("message_sent", {
      message_id: message.message_id,
      conversation_id,
      sent_at: message.sent_at,
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("typing_start")
  async handleTypingStart(
    @MessageBody() data: { conversation_id: number },
    @ConnectedSocket() client: AuthenticatedSocket
  ) {
    try {
      const { conversation_id } = data;
      const roomName = `conversation_${conversation_id}`;

      // Broadcast typing indicator to other participants (not sender)
      client.to(roomName).emit("user_typing", {
        conversation_id,
        user_id: client.userId,
        user_name: client.user?.name,
        is_typing: true,
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
    @MessageBody() data: { conversation_id: number },
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
      });

      this.logger.debug(
        `User ${client.userId} stopped typing in conversation ${conversation_id}`
      );
    } catch (error) {
      this.logger.error(`Error handling typing stop:`, error);
    }
  }

  /**
   * Send message to specific user (for offline message delivery)
   */
  async sendMessageToUser(
    userId: number,
    event: string,
    data: any
  ): Promise<boolean> {
    const userSockets = this.connectedUsers.get(userId);

    if (!userSockets || userSockets.length === 0) {
      this.logger.debug(`User ${userId} is not connected`);
      return false;
    }

    // Send to all user's connected sockets
    userSockets.forEach((socket) => {
      socket.emit(event, data);
    });

    this.logger.debug(
      `Sent ${event} to user ${userId} (${userSockets.length} sockets)`
    );
    return true;
  }

  /**
   * Send message to conversation room
   */
  async sendMessageToConversation(
    conversationId: number,
    event: string,
    data: any
  ): Promise<void> {
    const roomName = `conversation_${conversationId}`;
    this.server.to(roomName).emit(event, data);
    this.logger.debug(`Sent ${event} to conversation ${conversationId}`);
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId: number): boolean {
    const userSockets = this.connectedUsers.get(userId);
    return !!(userSockets && userSockets.length > 0);
  }

  /**
   * Get user's socket count
   */
  getUserSocketCount(userId: number): number {
    const userSockets = this.connectedUsers.get(userId);
    return userSockets ? userSockets.length : 0;
  }

  private extractTokenFromClient(client: AuthenticatedSocket): string | null {
    // Try to get token from auth header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }

    // Try to get token from query parameters
    const tokenFromQuery = client.handshake.query.token;
    if (typeof tokenFromQuery === "string") {
      return tokenFromQuery;
    }

    // Try to get token from auth object
    const tokenFromAuth = client.handshake.auth?.token;
    if (typeof tokenFromAuth === "string") {
      return tokenFromAuth;
    }

    return null;
  }

  private async verifyToken(token: string): Promise<any> {
    try {
      const payload = await this.jwtService.verifyAsync(token);
      return payload;
    } catch (error) {
      this.logger.warn(`Token verification failed:`, error.message);
      return null;
    }
  }

  private addUserConnection(userId: number, socket: AuthenticatedSocket): void {
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, []);
    }
    this.connectedUsers.get(userId)!.push(socket);
  }

  private removeUserConnection(
    userId: number,
    socket: AuthenticatedSocket
  ): void {
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets) {
      const index = userSockets.indexOf(socket);
      if (index > -1) {
        userSockets.splice(index, 1);
      }

      // Remove user entry if no more sockets
      if (userSockets.length === 0) {
        this.connectedUsers.delete(userId);
      }
    }
  }
}
