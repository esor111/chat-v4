import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ITokenService } from '../interfaces/auth.interface';

@Injectable()
export class TokenService implements ITokenService {
  constructor(private readonly jwtService: JwtService) {}

  sign(payload: any, secret: string, options?: any): string {
    return this.jwtService.sign(payload, { secret, ...options });
  }

  verify(token: string, secret: string): any {
    return this.jwtService.verify(token, { secret });
  }

  decode(token: string): any {
    return this.jwtService.decode(token);
  }
}