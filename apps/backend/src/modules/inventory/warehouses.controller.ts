import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { WarehousesService } from './warehouses.service';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto/warehouse.dto';

/** docs/02 2.2 — 재고 관리 하위 개념인 창고 관리: ADMIN만 CRUD */
@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Get()
  @RequirePermissions('INVENTORY', 'READ')
  @ApiOperation({ summary: '창고 목록' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.warehousesService.findAll(user);
  }

  @Post()
  @RequirePermissions('INVENTORY', 'CREATE')
  @ApiOperation({ summary: '창고 등록' })
  create(@Body() dto: CreateWarehouseDto, @CurrentUser() user: AuthUser) {
    return this.warehousesService.create(dto, user);
  }

  @Patch(':id')
  @RequirePermissions('INVENTORY', 'UPDATE')
  @ApiOperation({ summary: '창고 수정' })
  update(@Param('id') id: string, @Body() dto: UpdateWarehouseDto, @CurrentUser() user: AuthUser) {
    return this.warehousesService.update(id, dto, user);
  }

  @Delete(':id')
  @RequirePermissions('INVENTORY', 'DELETE')
  @ApiOperation({ summary: '창고 삭제(재고 없음 + 최소 1개 보장)' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.warehousesService.remove(id, user);
  }
}
