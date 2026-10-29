import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Audit } from '../../common/decorators/audit-log.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseOrderQueryDto, ReceivePurchaseOrderDto, UpdatePurchaseOrderDto } from './dto/purchase-order.dto';

/**
 * 발주서. 별도 PURCHASE 리소스를 만들지 않고 재고(INVENTORY) 권한을 재사용한다 — 조회는 READ,
 * 생성·수정·확정·입고는 UPDATE(기본 역할에서는 ADMIN만)이므로 기존 권한 행을 늘리지 않고도 배포할 수 있다.
 */
@ApiTags('Purchase Orders')
@ApiBearerAuth()
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Get()
  @RequirePermissions('INVENTORY', 'READ')
  @ApiOperation({ summary: '발주서 목록' })
  findAll(@Query() query: PurchaseOrderQueryDto, @CurrentUser() user: AuthUser) {
    return this.purchaseOrdersService.findAll(query, user);
  }

  @Get(':id')
  @RequirePermissions('INVENTORY', 'READ')
  @ApiOperation({ summary: '발주서 상세' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.purchaseOrdersService.findOne(id, user);
  }

  @Post('generate-drafts')
  @RequirePermissions('INVENTORY', 'UPDATE')
  @Audit('PURCHASE_ORDER_GENERATE', 'PURCHASE_ORDER')
  @ApiOperation({ summary: '안전재고 미달 품목으로 발주 초안 생성(매일 자동 실행과 같은 로직)' })
  generateDrafts(@CurrentUser() user: AuthUser) {
    return this.purchaseOrdersService.generateDraftsForCompany(user.companyId, user.sub);
  }

  @Patch(':id')
  @RequirePermissions('INVENTORY', 'UPDATE')
  @ApiOperation({ summary: '초안의 공급처·수량 수정' })
  update(@Param('id') id: string, @Body() dto: UpdatePurchaseOrderDto, @CurrentUser() user: AuthUser) {
    return this.purchaseOrdersService.update(id, dto, user);
  }

  @Post(':id/confirm')
  @RequirePermissions('INVENTORY', 'UPDATE')
  @Audit('PURCHASE_ORDER_CONFIRM', 'PURCHASE_ORDER')
  @ApiOperation({ summary: '발주 확정(사람 확인)' })
  confirm(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.purchaseOrdersService.confirm(id, user);
  }

  @Post(':id/cancel')
  @RequirePermissions('INVENTORY', 'UPDATE')
  @Audit('PURCHASE_ORDER_CANCEL', 'PURCHASE_ORDER')
  @ApiOperation({ summary: '발주 취소' })
  cancel(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.purchaseOrdersService.cancel(id, user);
  }

  @Post(':id/receive')
  @RequirePermissions('INVENTORY', 'UPDATE')
  @Audit('PURCHASE_ORDER_RECEIVE', 'PURCHASE_ORDER')
  @ApiOperation({ summary: '입고 처리(재고 증가 + 입고 이력)' })
  receive(@Param('id') id: string, @Body() dto: ReceivePurchaseOrderDto, @CurrentUser() user: AuthUser) {
    return this.purchaseOrdersService.receive(id, dto, user);
  }
}
