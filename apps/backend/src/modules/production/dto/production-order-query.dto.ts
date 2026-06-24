import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { ProductionStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/** docs/08.4.4 — GET /production-orders?status= (지연 필터 포함) */
export class ProductionOrderQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ProductionStatus })
  @IsOptional()
  @IsEnum(ProductionStatus)
  status?: ProductionStatus;

  @ApiPropertyOptional({
    description: 'true면 완료/취소되지 않았고 dueDate가 지난 오더만 조회 (docs/07 7.5 인덱스 목적)',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  delayed?: boolean;
}
