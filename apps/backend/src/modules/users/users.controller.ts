import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Audit } from '../../common/decorators/audit-log.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { AttendanceService } from '../attendance/attendance.service';
import { AttendanceQueryDto } from '../attendance/dto/attendance-query.dto';
import { PayrollService } from '../payroll/payroll.service';
import { PayrollHistoryQueryDto } from '../payroll/dto/payroll-history-query.dto';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';

/** docs/08-api-design.md 8.4.2 — 직원 관리 */
@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly attendanceService: AttendanceService,
    private readonly payrollService: PayrollService,
  ) {}

  @Get()
  @RequirePermissions('USER', 'READ')
  @ApiOperation({ summary: '직원 목록(검색/필터/페이지네이션)' })
  findAll(@Query() query: UserQueryDto, @CurrentUser() user: AuthUser) {
    return this.usersService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: '직원 상세 (USER:READ 또는 본인)' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.usersService.findOne(id, user);
  }

  @Post()
  @RequirePermissions('USER', 'CREATE')
  @Audit('USER_CREATE', 'USER')
  @ApiOperation({ summary: '직원 등록(초대)' })
  create(@Body() dto: CreateUserDto, @CurrentUser() user: AuthUser) {
    return this.usersService.create(dto, user);
  }

  @Patch(':id')
  @Audit('USER_UPDATE', 'USER')
  @ApiOperation({ summary: '직원 수정 (USER:UPDATE 또는 본인 일부 항목)' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() user: AuthUser) {
    return this.usersService.update(id, dto, user);
  }

  @Delete(':id')
  @RequirePermissions('USER', 'DELETE')
  @Audit('USER_RESIGN', 'USER')
  @ApiOperation({ summary: '퇴사 처리(소프트 삭제)' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.usersService.remove(id, user);
  }

  @Get(':id/attendances')
  @ApiOperation({ summary: '근태 이력 (ATTENDANCE:READ 또는 본인)' })
  findAttendances(@Param('id') id: string, @Query() query: AttendanceQueryDto, @CurrentUser() user: AuthUser) {
    return this.attendanceService.findHistoryForUser(id, query, user);
  }

  @Get(':id/payrolls')
  @ApiOperation({ summary: '급여 이력 (PAYROLL:READ 또는 본인)' })
  findPayrolls(@Param('id') id: string, @Query() query: PayrollHistoryQueryDto, @CurrentUser() user: AuthUser) {
    return this.payrollService.findHistoryForUser(id, query, user);
  }
}
