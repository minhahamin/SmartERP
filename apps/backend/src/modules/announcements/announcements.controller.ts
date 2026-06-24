import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './dto/announcement.dto';

/** docs/02 2.2 — ADMIN=CRUD, HR_MANAGER=C(인사공지), SALES_MANAGER=C(영업공지), EMPLOYEE=R */
@ApiTags('Announcements')
@ApiBearerAuth()
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get()
  @RequirePermissions('ANNOUNCEMENT', 'READ')
  @ApiOperation({ summary: '공지사항 목록(본인 읽음 여부 포함)' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.announcementsService.findAll(user);
  }

  @Get(':id')
  @RequirePermissions('ANNOUNCEMENT', 'READ')
  @ApiOperation({ summary: '공지사항 상세' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.announcementsService.findOne(id, user);
  }

  @Post()
  @RequirePermissions('ANNOUNCEMENT', 'CREATE')
  @ApiOperation({ summary: '공지사항 작성' })
  create(@Body() dto: CreateAnnouncementDto, @CurrentUser() user: AuthUser) {
    return this.announcementsService.create(dto, user);
  }

  @Post(':id/read')
  @ApiOperation({ summary: '읽음 처리(본인)' })
  markRead(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.announcementsService.markRead(id, user);
  }

  @Patch(':id')
  @RequirePermissions('ANNOUNCEMENT', 'UPDATE')
  @ApiOperation({ summary: '공지사항 내용 수정' })
  update(@Param('id') id: string, @Body() dto: UpdateAnnouncementDto, @CurrentUser() user: AuthUser) {
    return this.announcementsService.update(id, dto, user);
  }

  @Delete(':id')
  @RequirePermissions('ANNOUNCEMENT', 'DELETE')
  @ApiOperation({ summary: '공지사항 삭제' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.announcementsService.remove(id, user);
  }
}
