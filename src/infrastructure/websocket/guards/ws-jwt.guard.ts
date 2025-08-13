import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
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
      
      // Check if user is already authenticated (from connection)
      if (client.userId) {
        return true;
      }

      // If not authenticated during connection, try to authenticate now
      const token = this.extractToken(client);
      if (!token) {
        throw new WsException('No authentication token provided');
      }

      const payload = await this.verifyToken(token);
      if (!payload) {
        throw new WsException('Invalid authentication token');
      }

      // Attach user info to socket
      client.userId = payload.sub;
      client.user = {
        id: payload.sub,
        name: payload.name,
      };

      return true;
    } catch (error) {
      this.logger.warn(`WebSocket authentication failed:`, error.message);
      throw new WsException('Authentication failed');
    }
  }

  private extractToken(client: AuthenticatedSocket): string | null {
    // Try to get token from auth header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try to get token from query parameters
    const tokenFromQuery = client.handshake.query.token;
    if (typeof tokenFromQuery === 'string') {
      return tokenFromQuery;
    }

    // Try to get token from auth object
    const tokenFromAuth = client.handshake.auth?.token;
    if (typeof tokenFromAuth === 'string') {
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
}