import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Audit } from '../../common/decorators/audit-log.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { PayrollService } from './payroll.service';
import { GeneratePayrollDto, PayrollQueryDto, UpdatePayrollDto } from './dto/payroll.dto';

/** docs/08-api-design.md 8.4.3 — 급여 관리 */
@ApiTags('Payroll')
@ApiBearerAuth()
@Controller('payrolls')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get()
  @RequirePermissions('PAYROLL', 'READ')
  @ApiOperation({ summary: '월별 급여 목록 조회' })
  findAll(@Query() query: PayrollQueryDto, @CurrentUser() user: AuthUser) {
    return this.payrollService.findAll(query, user);
  }

  @Get('me')
  @ApiOperation({ summary: '본인 급여 이력 (인증 필요, 본인 한정)' })
  findMine(@CurrentUser() user: AuthUser) {
    return this.payrollService.findMine(user.sub);
  }

  @Post('generate')
  @RequirePermissions('PAYROLL', 'CREATE')
  @Audit('PAYROLL_GENERATE', 'PAYROLL')
  @ApiOperation({ summary: '월별 급여 일괄 생성(DRAFT)' })
  generate(@Body() dto: GeneratePayrollDto, @CurrentUser() user: AuthUser) {
    return this.payrollService.generateMonthly(dto, user);
  }

  @Patch(':id')
  @RequirePermissions('PAYROLL', 'UPDATE')
  @Audit('PAYROLL_UPDATE', 'PAYROLL')
  @ApiOperation({ summary: '수당/공제 수정(DRAFT만 가능)' })
  update(@Param('id') id: string, @Body() dto: UpdatePayrollDto) {
    return this.payrollService.update(id, dto);
  }

  @Post(':id/confirm')
  @RequirePermissions('PAYROLL', 'APPROVE')
  @Audit('PAYROLL_CONFIRM', 'PAYROLL')
  @ApiOperation({ summary: '확정 (DRAFT → CONFIRMED)' })
  confirm(@Param('id') id: string) {
    return this.payrollService.confirm(id);
  }

  @Post(':id/pay')
  @RequirePermissions('PAYROLL', 'APPROVE')
  @Audit('PAYROLL_PAY', 'PAYROLL')
  @ApiOperation({ summary: '지급 처리 (CONFIRMED → PAID)' })
  pay(@Param('id') id: string) {
    return this.payrollService.pay(id);
  }

  @Get(':id/payslip')
  @ApiOperation({ summary: '급여명세서 조회 (PAYROLL:READ 또는 본인)' })
  payslip(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.payrollService.getPayslip(id, user);
  }
}
