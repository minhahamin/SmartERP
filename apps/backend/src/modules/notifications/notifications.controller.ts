import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { NotificationsService } from './notifications.service';

/** 헤더 알림 벨. 본인(userId) 알림만 다루므로 `@RequirePermissions`를 적용하지 않고 인증만 요구한다(ai-chat 세션과 동일 패턴). */
@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: '내 알림 목록(최근 30건)' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.notificationsService.findAll(user);
  }

  @Post(':id/read')
  @ApiOperation({ summary: '알림 읽음 처리(본인)' })
  markRead(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.notificationsService.markRead(id, user);
  }

  @Post('read-all')
  @ApiOperation({ summary: '전체 읽음 처리(본인)' })
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notificationsService.markAllRead(user);
  }
}
