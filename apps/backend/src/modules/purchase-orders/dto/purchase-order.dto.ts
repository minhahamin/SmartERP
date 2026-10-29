import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PurchaseOrderStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class PurchaseOrderQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PurchaseOrderStatus })
  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;
}

export class PurchaseOrderItemQuantityDto {
  @ApiProperty()
  @IsUUID()
  itemId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity: number;
}

/** 초안 단계에서만 쓴다 — 승인자가 공급처와 수량을 고친다 */
export class UpdatePurchaseOrderDto {
  @ApiPropertyOptional({ description: 'VENDOR/BOTH 거래처' })
  @IsOptional()
  @IsUUID()
  partnerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  memo?: string;

  @ApiPropertyOptional({ type: [PurchaseOrderItemQuantityDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemQuantityDto)
  items?: PurchaseOrderItemQuantityDto[];
}

export class ReceivePurchaseOrderDto {
  @ApiProperty({ description: '입고할 창고' })
  @IsUUID()
  warehouseId: string;
}
