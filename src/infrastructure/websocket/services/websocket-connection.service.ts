import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: {
    id: string;
    name?: string;
  };
}

@Injectable()
export class WebSocketConnectionService {
  private readonly logger = new Logger(WebSocketConnectionService.name);
  private readonly connectedUsers = new Map<string, AuthenticatedSocket[]>();

  constructor(private readonly jwtService: JwtService) {}

  async authenticateSocket(client: AuthenticatedSocket): Promise<boolean> {
    try {
      const token = this.extractTokenFromClient(client);
      if (!token) {
        this.logger.warn(`No token provided for client ${client.id}`);
        return false;
      }

      const payload = await this.verifyToken(token);
      if (!payload) {
        this.logger.warn(`Invalid token for client ${client.id}`);
        return false;
      }

      const userId = payload.userId || payload.id || payload.sub;
      client.userId = userId;
      client.user = {
        id: userId,
        name: payload.name,
      };

      this.addUserConnection(userId, client);
      this.logger.log(`User ${userId} connected with socket ${client.id}`);
      return true;
    } catch (error) {
      this.logger.error(`Authentication error for client ${client.id}:`, error);
      return false;
    }
  }

  disconnectUser(client: AuthenticatedSocket): void {
    if (client.userId) {
      this.removeUserConnection(client.userId, client);
      this.logger.log(`User ${client.userId} disconnected (socket ${client.id})`);
    }
  }

  addUserConnection(userId: string, socket: AuthenticatedSocket): void {
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, []);
    }
    this.connectedUsers.get(userId)!.push(socket);
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
  }

  getUserSockets(userId: string): AuthenticatedSocket[] {
    return this.connectedUsers.get(userId) || [];
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

  private extractTokenFromClient(client: AuthenticatedSocket): string | null {
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }

    const tokenFromQuery = client.handshake.query.token;
    if (typeof tokenFromQuery === "string") {
      return tokenFromQuery;
    }

    const tokenFromAuth = client.handshake.auth?.token;
    if (typeof tokenFromAuth === "string") {
      return tokenFromAuth;
    }

    return null;
  }

  private async verifyToken(token: string): Promise<any> {
    try {
      const payload = this.jwtService.decode(token);
      if (!payload || typeof payload !== 'object') {
        throw new Error('Invalid token format');
      }
      
      // Check token expiration
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('Token has expired');
      }
      
      return payload;
    } catch (error) {
      this.logger.warn(`Token verification failed:`, error.message);
      return null;
    }
  }
}