import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { StatisticsService } from './statistics.service';

/** docs/02 2.2 — 통계 분석: 역할별로 다른 스코프의 대시보드 KPI를 반환 */
@ApiTags('Statistics')
@ApiBearerAuth()
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('dashboard')
  @RequirePermissions('STATISTICS', 'READ')
  @ApiOperation({ summary: '역할별 대시보드 KPI' })
  getDashboard(@CurrentUser() user: AuthUser) {
    return this.statisticsService.getDashboard(user);
  }
}
