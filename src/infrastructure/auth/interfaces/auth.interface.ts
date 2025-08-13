export interface JwtPayload {
  // Normalized user identifier. Some tokens may provide `id` instead of `userId`.
  userId?: string;
  // Alternate identifier used by external tokens; when present it maps to `userId`.
  id?: string;
  // Optional external identifier present in some tokens.
  kahaId?: string;
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  userId: string;
}

export interface IAuthService {
  validateUser(payload: JwtPayload): Promise<AuthUser | null>;
  generateTokens(userId: string): Promise<{ accessToken: string; refreshToken: string }>;
  verifyToken(token: string): Promise<JwtPayload>;
  refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }>;
}

export interface ITokenService {
  sign(payload: any, secret: string, options?: any): string;
  verify(token: string, secret: string): any;
  decode(token: string): any;
}