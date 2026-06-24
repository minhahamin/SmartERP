import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { PartnersService } from './partners.service';
import { CreatePartnerDto, UpdatePartnerDto } from './dto/partner.dto';
import { PartnerQueryDto } from './dto/partner-query.dto';

/** docs/02 2.2 — 거래처 관리: ADMIN/SALES_MANAGER=CRUD, EMPLOYEE=R */
@ApiTags('Partners')
@ApiBearerAuth()
@Controller('partners')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Get()
  @RequirePermissions('PARTNER', 'READ')
  @ApiOperation({ summary: '거래처 목록' })
  findAll(@Query() query: PartnerQueryDto, @CurrentUser() user: AuthUser) {
    return this.partnersService.findAll(query, user);
  }

  @Get(':id')
  @RequirePermissions('PARTNER', 'READ')
  @ApiOperation({ summary: '거래처 상세' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.partnersService.findOne(id, user);
  }

  @Post()
  @RequirePermissions('PARTNER', 'CREATE')
  @ApiOperation({ summary: '거래처 등록' })
  create(@Body() dto: CreatePartnerDto, @CurrentUser() user: AuthUser) {
    return this.partnersService.create(dto, user);
  }

  @Patch(':id')
  @RequirePermissions('PARTNER', 'UPDATE')
  @ApiOperation({ summary: '거래처 수정' })
  update(@Param('id') id: string, @Body() dto: UpdatePartnerDto, @CurrentUser() user: AuthUser) {
    return this.partnersService.update(id, dto, user);
  }

  @Delete(':id')
  @RequirePermissions('PARTNER', 'DELETE')
  @ApiOperation({ summary: '거래처 삭제' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.partnersService.remove(id, user);
  }
}
