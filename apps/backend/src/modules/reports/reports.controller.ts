import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { ReportsService } from './reports.service';
import { MonthlyReportQueryDto } from './dto/monthly-report-query.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('monthly/pdf')
  @RequirePermissions('STATISTICS', 'READ')
  @ApiOperation({ summary: '월간 경영 리포트 PDF(관리자). 없으면 지금 집계해 저장한 뒤 내려준다' })
  async monthlyPdf(@Query() query: MonthlyReportQueryDto, @CurrentUser() user: AuthUser, @Res() res: Response) {
    const buffer = await this.reportsService.exportPdf(query.year, query.month, user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="monthly-report-${query.year}-${String(query.month).padStart(2, '0')}.pdf"`);
    res.send(buffer);
  }
}
