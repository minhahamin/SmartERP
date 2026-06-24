import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Audit } from '../../common/decorators/audit-log.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { StockMovementsService } from './stock-movements.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { StockMovementQueryDto } from './dto/stock-movement-query.dto';

/** docs/08-api-design.md 8.4.4 */
@ApiTags('Stock Movements')
@ApiBearerAuth()
@Controller('stock-movements')
export class StockMovementsController {
  constructor(private readonly stockMovementsService: StockMovementsService) {}

  @Get()
  @RequirePermissions('STOCK_MOVEMENT', 'READ')
  @ApiOperation({ summary: '입출고 이력' })
  findAll(@Query() query: StockMovementQueryDto, @CurrentUser() user: AuthUser) {
    return this.stockMovementsService.findAll(query, user);
  }

  @Post()
  @RequirePermissions('STOCK_MOVEMENT', 'CREATE')
  @Audit('STOCK_MOVEMENT_CREATE', 'STOCK_MOVEMENT')
  @ApiOperation({ summary: '입출고 등록' })
  create(@Body() dto: CreateStockMovementDto, @CurrentUser() user: AuthUser) {
    return this.stockMovementsService.create(dto, user);
  }
}
