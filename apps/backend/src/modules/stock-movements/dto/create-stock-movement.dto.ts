import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { StockMovementType, StockRefType } from '@prisma/client';

/** 창고 간 TRANSFER는 출발 창고 OUT + 도착 창고 IN, 두 건의 StockMovement로 등록한다 (단일 행에 목적지 창고 컬럼이 없음) */
export class CreateStockMovementDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty()
  @IsUUID()
  warehouseId: string;

  @ApiProperty({ enum: StockMovementType })
  @IsEnum(StockMovementType)
  type: StockMovementType;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ enum: StockRefType })
  @IsEnum(StockRefType)
  refType: StockRefType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  refId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  memo?: string;
}
