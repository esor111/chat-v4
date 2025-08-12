import { Module, Global } from '@nestjs/common';
import { ProfileMockService } from './profile-mock.service';
import { SimpleProfileCacheService } from './simple-profile-cache.service';

@Global()
@Module({
  providers: [
    ProfileMockService,
    SimpleProfileCacheService,
  ],
  exports: [
    ProfileMockService,
    SimpleProfileCacheService,
  ],
})
export class ProfileModule {}