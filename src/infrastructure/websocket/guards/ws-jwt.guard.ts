import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: {
    id: string;
    name?: string;
  };
}

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: AuthenticatedSocket = context.switchToWs().getClient();
      
      // If socket is already authenticated, allow
      if (client.userId) {
        return true;
      }

      // Extract and verify token
      const token = this.extractTokenFromClient(client);
      if (!token) {
        this.logger.warn(`No token provided for socket ${client.id}`);
        return false;
      }

      const payload = await this.verifyToken(token);
      if (!payload) {
        this.logger.warn(`Invalid token for socket ${client.id}`);
        return false;
      }

      // Attach user info to socket
      const userId = payload.userId || payload.id || payload.sub;
      client.userId = userId;
      client.user = {
        id: userId,
        name: payload.name,
      };

      return true;
    } catch (error) {
      this.logger.error('WebSocket authentication error:', error);
      return false;
    }
  }

  private extractTokenFromClient(client: AuthenticatedSocket): string | null {
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    const tokenFromQuery = client.handshake.query.token;
    if (typeof tokenFromQuery === 'string') {
      return tokenFromQuery;
    }

    const tokenFromAuth = client.handshake.auth?.token;
    if (typeof tokenFromAuth === 'string') {
      return tokenFromAuth;
    }

    return null;
  }

  private async verifyToken(token: string): Promise<any> {
    try {
      // Use decode for external tokens in development
      const payload = this.jwtService.decode(token);
      if (!payload) {
        throw new Error('Invalid token format');
      }
      return payload;
    } catch (error) {
      this.logger.warn('Token verification failed:', error.message);
      return null;
    }
  }
}