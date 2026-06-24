import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { LeaveService } from './leave.service';

@ApiTags('Leave')
@ApiBearerAuth()
@Controller('leave-balances')
export class LeaveBalanceController {
  constructor(private readonly leaveService: LeaveService) {}

  @Get('me')
  @ApiOperation({ summary: '본인 연차 잔여 현황' })
  findMine(@Query('year') year: string, @CurrentUser() user: AuthUser) {
    return this.leaveService.findBalance(user.sub, year ? Number(year) : new Date().getFullYear());
  }

  @Get(':userId')
  @RequirePermissions('LEAVE', 'READ')
  @ApiOperation({ summary: '직원 연차 잔여 현황(HR/Admin)' })
  findOne(@Param('userId') userId: string, @Query('year') year: string) {
    return this.leaveService.findBalance(userId, year ? Number(year) : new Date().getFullYear());
  }
}
