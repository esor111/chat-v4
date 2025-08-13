import { IsUUID, IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsUUID(4, { message: 'User ID must be a valid UUID' })
  userId: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken: string;
}