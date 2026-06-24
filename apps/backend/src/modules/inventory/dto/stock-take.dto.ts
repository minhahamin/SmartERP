import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';

class StockTakeItemDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  actualQuantity: number;
}

/** docs/08.4.4 — 재고 실사 확정(차이분 자동 ADJUST 생성) */
export class StockTakeDto {
  @ApiProperty()
  @IsUUID()
  warehouseId: string;

  @ApiProperty({ type: [StockTakeItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StockTakeItemDto)
  items: StockTakeItemDto[];
}
