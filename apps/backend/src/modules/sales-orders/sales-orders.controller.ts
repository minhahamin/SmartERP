import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Audit } from '../../common/decorators/audit-log.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { SalesOrdersService } from './sales-orders.service';
import { CreateSalesOrderDto } from './dto/sales-order.dto';
import { SalesOrderQueryDto } from './dto/sales-order-query.dto';
import { UpdateSalesOrderStatusDto } from './dto/update-sales-order-status.dto';

/** 영업 관리: ADMIN/SALES_MANAGER=CRUD, EMPLOYEE=R (docs/02 2.2 PARTNER와 동일한 접근 경계) */
@ApiTags('Sales Orders')
@ApiBearerAuth()
@Controller('sales-orders')
export class SalesOrdersController {
  constructor(private readonly salesOrdersService: SalesOrdersService) {}

  @Get()
  @RequirePermissions('SALES_ORDER', 'READ')
  @ApiOperation({ summary: '영업 주문 목록' })
  findAll(@Query() query: SalesOrderQueryDto, @CurrentUser() user: AuthUser) {
    return this.salesOrdersService.findAll(query, user);
  }

  @Get(':id')
  @RequirePermissions('SALES_ORDER', 'READ')
  @ApiOperation({ summary: '영업 주문 상세(품목 포함)' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.salesOrdersService.findOne(id, user);
  }

  @Post()
  @RequirePermissions('SALES_ORDER', 'CREATE')
  @Audit('SALES_ORDER_CREATE', 'SALES_ORDER')
  @ApiOperation({ summary: '영업 주문 등록(견적, 품목 목록 포함)' })
  create(@Body() dto: CreateSalesOrderDto, @CurrentUser() user: AuthUser) {
    return this.salesOrdersService.create(dto, user);
  }

  @Patch(':id/status')
  @RequirePermissions('SALES_ORDER', 'UPDATE')
  @Audit('SALES_ORDER_STATUS_CHANGE', 'SALES_ORDER')
  @ApiOperation({ summary: '주문 상태 변경(견적/확정/출고완료/인보이스발행/취소)' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateSalesOrderStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.salesOrdersService.updateStatus(id, dto, user);
  }
}
