import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Audit } from '../../common/decorators/audit-log.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { ProductionService } from './production.service';
import { CreateProductionOrderDto } from './dto/production-order.dto';
import { ProductionOrderQueryDto } from './dto/production-order-query.dto';
import { UpdateProductionStatusDto } from './dto/update-production-status.dto';

/** docs/08-api-design.md 8.4.4 */
@ApiTags('Production')
@ApiBearerAuth()
@Controller('production-orders')
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Get()
  @RequirePermissions('PRODUCTION', 'READ')
  @ApiOperation({ summary: '생산 오더 목록(지연 필터 포함)' })
  findAll(@Query() query: ProductionOrderQueryDto, @CurrentUser() user: AuthUser) {
    return this.productionService.findAll(query, user);
  }

  @Get(':id')
  @RequirePermissions('PRODUCTION', 'READ')
  @ApiOperation({ summary: '생산 오더 상세' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.productionService.findOne(id, user);
  }

  @Post()
  @RequirePermissions('PRODUCTION', 'CREATE')
  @ApiOperation({ summary: '생산 오더 등록' })
  create(@Body() dto: CreateProductionOrderDto, @CurrentUser() user: AuthUser) {
    return this.productionService.create(dto, user);
  }

  @Patch(':id/status')
  @RequirePermissions('PRODUCTION', 'UPDATE')
  @Audit('PRODUCTION_STATUS_CHANGE', 'PRODUCTION')
  @ApiOperation({ summary: '상태 변경(완료 시 입고 자동 생성)' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateProductionStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.productionService.updateStatus(id, dto, user);
  }
}
