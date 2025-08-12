import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations/conversations.controller';
import { HealthController } from './health/health.controller';
import { ServicesModule } from '@application/services/services.module';
import { RepositoryModule } from '@infrastructure/repositories/repository.module';
import { ProfileModule } from '@infrastructure/profile/profile.module';
import { CacheModule } from '@infrastructure/cache/cache.module';

@Module({
  imports: [
    ServicesModule,
    RepositoryModule,
    ProfileModule,
    CacheModule,
  ],
  controllers: [
    ConversationsController,
    HealthController,
  ],
})
export class ApiModule {}