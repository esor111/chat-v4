import { IsNumber, IsString, IsNotEmpty, Min } from 'class-validator';

export class LoginDto {
  @IsNumber()
  @Min(1, { message: 'User ID must be a positive number' })
  userId: number;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken: string;
}