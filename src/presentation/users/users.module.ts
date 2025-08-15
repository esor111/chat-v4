import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { RepositoryModule } from '@infrastructure/repositories/repository.module';
import { ProfileModule } from '@infrastructure/profile/profile.module';

@Module({
  imports: [RepositoryModule, ProfileModule],
  controllers: [UsersController],
})
export class UsersModule {}