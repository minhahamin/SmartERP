import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { ProductionStatus } from '@prisma/client';

export class UpdateProductionStatusDto {
  @ApiProperty({ enum: ProductionStatus })
  @IsEnum(ProductionStatus)
  status: ProductionStatus;

  @ApiPropertyOptional({ description: 'COMPLETED 전환 시 실제 생산 수량(미입력 시 plannedQty 사용)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  producedQty?: number;
}
