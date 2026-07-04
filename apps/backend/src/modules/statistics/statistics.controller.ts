import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { StatisticsService } from './statistics.service';

/** docs/02 2.2 — 통계 분석: 역할별로 다른 스코프의 대시보드 KPI/차트를 반환 */
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

  @Get('sales')
  @RequirePermissions('STATISTICS', 'READ')
  @ApiOperation({ summary: '매출 통계 차트(월별 추이/거래처별 Top5) — ADMIN/SALES_MANAGER' })
  getSalesCharts(@CurrentUser() user: AuthUser) {
    return this.statisticsService.getSalesCharts(user);
  }

  @Get('inventory')
  @RequirePermissions('STATISTICS', 'READ')
  @ApiOperation({ summary: '재고 통계 차트(창고별/분류별) — ADMIN' })
  getInventoryCharts(@CurrentUser() user: AuthUser) {
    return this.statisticsService.getInventoryCharts(user);
  }

  @Get('hr')
  @RequirePermissions('STATISTICS', 'READ')
  @ApiOperation({ summary: '인사 통계 차트(부서별/역할별 인원) — ADMIN/HR_MANAGER' })
  getHrCharts(@CurrentUser() user: AuthUser) {
    return this.statisticsService.getHrCharts(user);
  }

  @Get('me')
  @RequirePermissions('STATISTICS', 'READ')
  @ApiOperation({ summary: '본인 근태/연차 통계(self-service)' })
  getMyCharts(@CurrentUser() user: AuthUser) {
    return this.statisticsService.getMyCharts(user);
  }
}
