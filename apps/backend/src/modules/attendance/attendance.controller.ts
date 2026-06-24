import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { AttendanceService } from './attendance.service';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import { CreateAttendanceDto, UpdateAttendanceDto } from './dto/create-attendance.dto';

/** docs/08-api-design.md 8.2/8.4 패턴 + docs/02 2.2 근태관리 */
@ApiTags('Attendance')
@ApiBearerAuth()
@Controller('attendances')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  @RequirePermissions('ATTENDANCE', 'READ')
  @ApiOperation({ summary: '근태 목록(부서/기간 필터)' })
  findAll(@Query() query: AttendanceQueryDto, @CurrentUser() user: AuthUser) {
    return this.attendanceService.findAll(query, user);
  }

  @Get('me')
  @ApiOperation({ summary: '본인 근태 이력' })
  findMine(@Query() query: AttendanceQueryDto, @CurrentUser() user: AuthUser) {
    return this.attendanceService.findHistoryForUser(user.sub, query, user);
  }

  @Post('check-in')
  @ApiOperation({ summary: '본인 출근 체크 (docs/02 2.2 "C(own 출퇴근)")' })
  checkIn(@CurrentUser() user: AuthUser) {
    return this.attendanceService.checkIn(user);
  }

  @Post('check-out')
  @ApiOperation({ summary: '본인 퇴근 체크' })
  checkOut(@CurrentUser() user: AuthUser) {
    return this.attendanceService.checkOut(user);
  }

  @Post()
  @RequirePermissions('ATTENDANCE', 'CREATE')
  @ApiOperation({ summary: '근태 수동 등록(HR/Admin 정정)' })
  create(@Body() dto: CreateAttendanceDto) {
    return this.attendanceService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('ATTENDANCE', 'UPDATE')
  @ApiOperation({ summary: '근태 수정(HR/Admin 정정)' })
  update(@Param('id') id: string, @Body() dto: UpdateAttendanceDto) {
    return this.attendanceService.update(id, dto);
  }
}
