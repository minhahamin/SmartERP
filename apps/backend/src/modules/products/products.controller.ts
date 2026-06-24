import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { ProductQueryDto } from './dto/product-query.dto';

/** docs/02 2.2 — 제품 관리: ADMIN=CRUD, SALES_MANAGER=R+U(가격 제외), EMPLOYEE=R */
@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @RequirePermissions('PRODUCT', 'READ')
  @ApiOperation({ summary: '제품 목록' })
  findAll(@Query() query: ProductQueryDto, @CurrentUser() user: AuthUser) {
    return this.productsService.findAll(query, user);
  }

  @Get(':id')
  @RequirePermissions('PRODUCT', 'READ')
  @ApiOperation({ summary: '제품 상세' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.productsService.findOne(id, user);
  }

  @Post()
  @RequirePermissions('PRODUCT', 'CREATE')
  @ApiOperation({ summary: '제품 등록' })
  create(@Body() dto: CreateProductDto, @CurrentUser() user: AuthUser) {
    return this.productsService.create(dto, user);
  }

  @Patch(':id')
  @RequirePermissions('PRODUCT', 'UPDATE')
  @ApiOperation({ summary: '제품 수정(SALES_MANAGER는 가격 필드 제외)' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto, @CurrentUser() user: AuthUser) {
    return this.productsService.update(id, dto, user);
  }

  @Delete(':id')
  @RequirePermissions('PRODUCT', 'DELETE')
  @ApiOperation({ summary: '제품 삭제' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.productsService.remove(id, user);
  }
}
