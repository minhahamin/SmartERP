import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Audit } from '../../common/decorators/audit-log.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { LeaveService } from './leave.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { LeaveQueryDto } from './dto/leave-query.dto';

/** docs/02 2.2 — 휴가 승인/반려는 ADMIN/HR_MANAGER만, 신청/취소는 본인이면 누구나 가능 */
@ApiTags('Leave')
@ApiBearerAuth()
@Controller('leave-requests')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Get()
  @RequirePermissions('LEAVE', 'READ')
  @ApiOperation({ summary: '휴가 신청 목록(승인 대기 포함)' })
  findAll(@Query() query: LeaveQueryDto, @CurrentUser() user: AuthUser) {
    return this.leaveService.findAll(query, user);
  }

  @Get('me')
  @ApiOperation({ summary: '본인 휴가 신청 이력' })
  findMine(@CurrentUser() user: AuthUser) {
    return this.leaveService.findMine(user.sub);
  }

  @Post()
  @ApiOperation({ summary: '휴가 신청(본인)' })
  create(@Body() dto: CreateLeaveRequestDto, @CurrentUser() user: AuthUser) {
    return this.leaveService.create(dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: '대기 중인 휴가 신청 취소(본인)' })
  cancel(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.leaveService.cancel(id, user);
  }

  @Patch(':id/approve')
  @RequirePermissions('LEAVE', 'APPROVE')
  @Audit('LEAVE_APPROVE', 'LEAVE')
  @ApiOperation({ summary: '휴가 승인' })
  approve(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.leaveService.approve(id, user);
  }

  @Patch(':id/reject')
  @RequirePermissions('LEAVE', 'APPROVE')
  @Audit('LEAVE_REJECT', 'LEAVE')
  @ApiOperation({ summary: '휴가 반려' })
  reject(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.leaveService.reject(id, user);
  }
}
