import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { AuditLogService } from './audit-log.service';

/** 감사로그 조회 — 적재만 있고 조회 API가 없던 공백 보완. ADMIN( PERMISSION:READ 보유 ) 전용 */
@ApiTags('AuditLog')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @RequirePermissions('PERMISSION', 'READ')
  @ApiOperation({ summary: '감사로그 조회 (테넌트 격리, 최신순)' })
  findAll(
    @Query() query: { page?: number; limit?: number; resource?: string; action?: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.auditLogService.findAll(query, user);
  }
}
