import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '@infrastructure/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@infrastructure/auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('conversations')
@Controller('api/conversations-simple')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SimpleConversationsController {
  @Get()
  async getConversations(@CurrentUser() user: any) {
    return {
      message: 'Simple conversations endpoint working',
      userId: user.userId,
      conversations: [
        {
          conversation_id: 1,
          type: 'direct',
          last_activity: new Date().toISOString(),
          participants: ['Test User 1'],
        },
        {
          conversation_id: 2,
          type: 'group',
          last_activity: new Date().toISOString(),
          participants: ['Test User 1', 'Test User 2'],
        },
        {
          conversation_id: 3,
          type: 'business',
          last_activity: new Date().toISOString(),
          participants: ['Business Support'],
        },
      ],
      total: 3,
    };
  }
}