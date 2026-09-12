import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Audit } from '../../common/decorators/audit-log.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { RolesService } from './roles.service';
import { CreateRoleDto, SetRolePermissionsDto, UpdateRoleDto } from './dto/role.dto';

/** docs/02 2.2 — 권한 관리: ADMIN만 CRUD 가능 */
@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('permissions')
  @RequirePermissions('PERMISSION', 'READ')
  @ApiOperation({ summary: '권한 토글 UI에 쓰일 전체 Permission 카탈로그' })
  findAllPermissions() {
    return this.rolesService.findAllPermissions();
  }

  /**
   * 공지사항 대상 역할 표시/선택처럼 "역할 이름"만 필요한 화면은 전 직원이 접근하므로,
   * 권한 매트릭스 전체를 담은 findAll()(PERMISSION:READ 필요)과 분리해 인증만 요구한다.
   */
  @Get('options')
  @ApiOperation({ summary: '역할 이름 옵션 목록(권한 정보 없이 id/name만)' })
  findOptions(@CurrentUser() user: AuthUser) {
    return this.rolesService.findOptions(user);
  }

  /**
   * "데모: 역할 전환"(헤더)이 재로그인 없이 메뉴 노출을 미리보기 위해 쓴다. 역할이 "무엇을 할 수
   * 있는지"(resource:action 목록)만 노출하며, 회원/매출 등 민감한 부가 정보(findAll()의 memberCount 등)는
   * 포함하지 않으므로 findAll()과 달리 PERMISSION:READ 없이 인증만 요구한다(findOptions와 동일한 방침).
   */
  @Get('preview-permissions')
  @ApiOperation({ summary: '역할별 보유 권한 미리보기(데모 역할 전환용, 인증만 요구)' })
  findPermissionsPreview(@CurrentUser() user: AuthUser) {
    return this.rolesService.findPermissionsPreview(user);
  }

  @Get()
  @RequirePermissions('PERMISSION', 'READ')
  @ApiOperation({ summary: '역할 목록(보유 권한 포함)' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.rolesService.findAll(user);
  }

  @Get(':id')
  @RequirePermissions('PERMISSION', 'READ')
  @ApiOperation({ summary: '역할 상세' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.rolesService.findOne(id, user);
  }

  @Post()
  @RequirePermissions('PERMISSION', 'CREATE')
  @Audit('ROLE_CREATE', 'PERMISSION')
  @ApiOperation({ summary: '커스텀 역할 추가' })
  create(@Body() dto: CreateRoleDto, @CurrentUser() user: AuthUser) {
    return this.rolesService.create(dto, user);
  }

  @Patch(':id')
  @RequirePermissions('PERMISSION', 'UPDATE')
  @Audit('ROLE_UPDATE', 'PERMISSION')
  @ApiOperation({ summary: '역할 수정' })
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto, @CurrentUser() user: AuthUser) {
    return this.rolesService.update(id, dto, user);
  }

  @Put(':id/permissions')
  @RequirePermissions('PERMISSION', 'UPDATE')
  @Audit('ROLE_PERMISSIONS_CHANGE', 'PERMISSION')
  @ApiOperation({ summary: '역할의 권한 매트릭스를 토글 결과로 일괄 교체' })
  setPermissions(@Param('id') id: string, @Body() dto: SetRolePermissionsDto, @CurrentUser() user: AuthUser) {
    return this.rolesService.setPermissions(id, dto, user);
  }

  @Delete(':id')
  @RequirePermissions('PERMISSION', 'DELETE')
  @Audit('ROLE_DELETE', 'PERMISSION')
  @ApiOperation({ summary: '역할 삭제' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.rolesService.remove(id, user);
  }
}
