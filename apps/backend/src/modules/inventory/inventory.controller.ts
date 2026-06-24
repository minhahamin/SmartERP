import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Audit } from '../../common/decorators/audit-log.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { InventoryService } from './inventory.service';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import { StockTakeDto } from './dto/stock-take.dto';

/** docs/08-api-design.md 8.4.4 — 재고/입출고/생산 */
@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @RequirePermissions('INVENTORY', 'READ')
  @ApiOperation({ summary: '재고 현황' })
  findAll(@Query() query: InventoryQueryDto, @CurrentUser() user: AuthUser) {
    return this.inventoryService.findAll(query, user);
  }

  @Post('stock-take')
  @RequirePermissions('INVENTORY', 'UPDATE')
  @Audit('INVENTORY_STOCK_TAKE', 'INVENTORY')
  @ApiOperation({ summary: '재고 실사 확정(차이분 자동 ADJUST 생성)' })
  stockTake(@Body() dto: StockTakeDto, @CurrentUser() user: AuthUser) {
    return this.inventoryService.stockTake(dto, user);
  }
}
