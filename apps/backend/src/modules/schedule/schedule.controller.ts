import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { ScheduleService } from './schedule.service';
import { CreateScheduleDto, UpdateScheduleDto } from './dto/schedule.dto';
import { ScheduleQueryDto } from './dto/schedule-query.dto';

/** docs/02 2.2 — 일정 관리: 모든 역할이 본인 일정 CRUD 가능, ADMIN/HR_MANAGER는 전체 CRUD */
@ApiTags('Schedule')
@ApiBearerAuth()
@Controller('schedules')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get()
  @RequirePermissions('SCHEDULE', 'READ')
  @ApiOperation({ summary: '일정 목록(기간 필터)' })
  findAll(@Query() query: ScheduleQueryDto, @CurrentUser() user: AuthUser) {
    return this.scheduleService.findAll(query, user);
  }

  @Get(':id')
  @RequirePermissions('SCHEDULE', 'READ')
  @ApiOperation({ summary: '일정 상세' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.scheduleService.findOne(id, user);
  }

  @Post()
  @RequirePermissions('SCHEDULE', 'CREATE')
  @ApiOperation({ summary: '일정 등록' })
  create(@Body() dto: CreateScheduleDto, @CurrentUser() user: AuthUser) {
    return this.scheduleService.create(dto, user);
  }

  @Patch(':id')
  @RequirePermissions('SCHEDULE', 'UPDATE')
  @ApiOperation({ summary: '일정 수정(본인 일정 또는 ADMIN/HR_MANAGER)' })
  update(@Param('id') id: string, @Body() dto: UpdateScheduleDto, @CurrentUser() user: AuthUser) {
    return this.scheduleService.update(id, dto, user);
  }

  @Delete(':id')
  @RequirePermissions('SCHEDULE', 'DELETE')
  @ApiOperation({ summary: '일정 삭제(본인 일정 또는 ADMIN/HR_MANAGER)' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.scheduleService.remove(id, user);
  }
}
