import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';

/** docs/02 2.2 — ADMIN=CRUD, 그 외 역할=R */
@ApiTags('Departments')
@ApiBearerAuth()
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @RequirePermissions('DEPARTMENT', 'READ')
  @ApiOperation({ summary: '부서 목록' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.departmentsService.findAll(user);
  }

  @Get(':id')
  @RequirePermissions('DEPARTMENT', 'READ')
  @ApiOperation({ summary: '부서 상세' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.departmentsService.findOne(id, user);
  }

  @Post()
  @RequirePermissions('DEPARTMENT', 'CREATE')
  @ApiOperation({ summary: '부서 등록' })
  create(@Body() dto: CreateDepartmentDto, @CurrentUser() user: AuthUser) {
    return this.departmentsService.create(dto, user);
  }

  @Patch(':id')
  @RequirePermissions('DEPARTMENT', 'UPDATE')
  @ApiOperation({ summary: '부서 수정' })
  update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto, @CurrentUser() user: AuthUser) {
    return this.departmentsService.update(id, dto, user);
  }

  @Delete(':id')
  @RequirePermissions('DEPARTMENT', 'DELETE')
  @ApiOperation({ summary: '부서 삭제' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.departmentsService.remove(id, user);
  }
}
