export interface JwtPayload {
  userId: number;
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  userId: number;
}

export interface IAuthService {
  validateUser(payload: JwtPayload): Promise<AuthUser | null>;
  generateTokens(userId: number): Promise<{ accessToken: string; refreshToken: string }>;
  verifyToken(token: string): Promise<JwtPayload>;
  refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }>;
}

export interface ITokenService {
  sign(payload: any, secret: string, options?: any): string;
  verify(token: string, secret: string): any;
  decode(token: string): any;
}