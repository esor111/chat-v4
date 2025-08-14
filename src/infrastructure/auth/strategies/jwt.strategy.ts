import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../services/auth.service';
import { JwtPayload, AuthUser } from '../interfaces/auth.interface';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: true, // We'll handle expiration in auth service
      secretOrKey: configService.get<string>('JWT_SECRET'),
      passReqToCallback: true, // We need the request to extract token manually
    });
  }

  async authenticate(req: Request, options?: any): Promise<void> {
    try {
      // Extract token manually
      const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
      if (!token) {
        return this.fail('No token provided', 401);
      }

      // Verify token using our auth service (handles external tokens)
      const payload = await this.authService.verifyToken(token);
      
      // Validate user from payload
      const user = await this.authService.validateUser(payload);
      if (!user) {
        return this.fail('Invalid token payload', 401);
      }

      return this.success(user);
    } catch (error) {
      return this.fail('Authentication failed', 401);
    }
  }

  async validate(req: Request, payload: JwtPayload): Promise<AuthUser> {
    // This method won't be called due to custom authenticate method
    const user = await this.authService.validateUser(payload);
    if (!user) {
      throw new UnauthorizedException('Invalid token payload');
    }
    return user;
  }
}