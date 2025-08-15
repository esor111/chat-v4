import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { ServerToClientEvents } from '../types/websocket-events.types';
import { WebSocketConnectionService } from './websocket-connection.service';

@Injectable()
export class WebSocketBroadcastService {
  private readonly logger = new Logger(WebSocketBroadcastService.name);
  private server: Server;

  constructor(
    private readonly connectionService: WebSocketConnectionService
  ) {}

  setServer(server: Server): void {
    this.server = server;
  }

  /**
   * Send message to specific user across all their connected devices
   */
  async sendMessageToUser(
    userId: string,
    event: keyof ServerToClientEvents,
    data: any
  ): Promise<boolean> {
    const userSockets = this.connectionService.getUserSockets(userId);

    if (userSockets.length === 0) {
      this.logger.debug(`User ${userId} is not connected`);
      return false;
    }

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
    conversationId: string,
    event: keyof ServerToClientEvents,
    data: any
  ): Promise<void> {
    if (!this.server) {
      this.logger.warn('Server not initialized');
      return;
    }

    const roomName = `conversation_${conversationId}`;
    this.server.to(roomName).emit(event as any, data);
    this.logger.debug(`Sent ${event} to conversation ${conversationId}`);
  }

  /**
   * Send message to conversation room excluding specific user
   */
  async sendMessageToConversationExcluding(
    conversationId: string,
    excludeUserId: string,
    event: keyof ServerToClientEvents,
    data: any
  ): Promise<void> {
    if (!this.server) {
      this.logger.warn('Server not initialized');
      return;
    }

    const roomName = `conversation_${conversationId}`;
    const userSockets = this.connectionService.getUserSockets(excludeUserId);
    
    // Get all sockets in the room except the excluded user's sockets
    const room = this.server.sockets.adapter.rooms.get(roomName);
    if (room) {
      const excludeSocketIds = new Set(userSockets.map(socket => socket.id));
      
      room.forEach(socketId => {
        if (!excludeSocketIds.has(socketId)) {
          this.server.to(socketId).emit(event as any, data);
        }
      });
    }

    this.logger.debug(`Sent ${event} to conversation ${conversationId} excluding user ${excludeUserId}`);
  }

  /**
   * Broadcast system message to all connected users
   */
  async broadcastSystemMessage(
    event: keyof ServerToClientEvents,
    data: any
  ): Promise<void> {
    if (!this.server) {
      this.logger.warn('Server not initialized');
      return;
    }

    this.server.emit(event as any, data);
    this.logger.debug(`Broadcasted ${event} to all connected users`);
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    totalUsers: number;
    totalConnections: number;
    averageConnectionsPerUser: number;
  } {
    const totalUsers = this.connectionService.getConnectedUsersCount();
    const totalConnections = Array.from(this.server?.sockets.sockets.values() || []).length;
    
    return {
      totalUsers,
      totalConnections,
      averageConnectionsPerUser: totalUsers > 0 ? totalConnections / totalUsers : 0,
    };
  }
}