import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';

export class SalesOrderItemDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  unitPrice: number;
}

export class CreateSalesOrderDto {
  @ApiProperty()
  @IsUUID()
  partnerId: string;

  @ApiProperty()
  @IsDateString()
  orderDate: string;

  @ApiProperty({ type: [SalesOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SalesOrderItemDto)
  items: SalesOrderItemDto[];
}
