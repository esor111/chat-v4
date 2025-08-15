import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { ServerToClientEvents } from './types/websocket-events.types';

interface AuthenticatedSocket {
  userId?: string;
  user?: {
    id: string;
    name?: string;
  };
}

@Injectable()
export class WebSocketService {
  private readonly logger = new Logger(WebSocketService.name);
  private server: Server;
  private readonly connectedUsers = new Map<string, AuthenticatedSocket[]>();

  setServer(server: Server): void {
    this.server = server;
  }

  addUserConnection(userId: string, socket: AuthenticatedSocket): void {
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, []);
    }
    this.connectedUsers.get(userId)!.push(socket);
    this.logger.debug(`User ${userId} connected. Total connections: ${this.getUserSocketCount(userId)}`);
  }

  removeUserConnection(userId: string, socket: AuthenticatedSocket): void {
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets) {
      const index = userSockets.indexOf(socket);
      if (index > -1) {
        userSockets.splice(index, 1);
      }

      if (userSockets.length === 0) {
        this.connectedUsers.delete(userId);
      }
    }
    this.logger.debug(`User ${userId} disconnected. Remaining connections: ${this.getUserSocketCount(userId)}`);
  }

  async sendMessageToUser(
    userId: string,
    event: keyof ServerToClientEvents,
    data: any
  ): Promise<boolean> {
    const userSockets = this.connectedUsers.get(userId);

    if (!userSockets || userSockets.length === 0) {
      this.logger.debug(`User ${userId} is not connected`);
      return false;
    }

    userSockets.forEach((socket) => {
      (socket as any).emit(event, data);
    });

    this.logger.debug(`Sent ${event} to user ${userId} (${userSockets.length} sockets)`);
    return true;
  }

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

  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  isUserConnected(userId: string): boolean {
    const userSockets = this.connectedUsers.get(userId);
    return !!(userSockets && userSockets.length > 0);
  }

  getUserSocketCount(userId: string): number {
    const userSockets = this.connectedUsers.get(userId);
    return userSockets ? userSockets.length : 0;
  }

  getConnectionStats(): {
    totalUsers: number;
    totalConnections: number;
    averageConnectionsPerUser: number;
  } {
    const totalUsers = this.connectedUsers.size;
    const totalConnections = Array.from(this.connectedUsers.values())
      .reduce((sum, sockets) => sum + sockets.length, 0);
    
    return {
      totalUsers,
      totalConnections,
      averageConnectionsPerUser: totalUsers > 0 ? totalConnections / totalUsers : 0,
    };
  }
}