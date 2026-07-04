import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { SalesOrderStatus } from '@prisma/client';

export class UpdateSalesOrderStatusDto {
  @ApiProperty({ enum: SalesOrderStatus })
  @IsEnum(SalesOrderStatus)
  status: SalesOrderStatus;
}
