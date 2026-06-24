import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/** docs/08-api-design.md 8.1 — page(기본1)/limit(기본20,최대100) 공통 페이지네이션 쿼리 */
export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ description: "정렬 (예: -createdAt)" })
  @IsOptional()
  @IsString()
  sort?: string;
}

export type SortOrder = 'asc' | 'desc';

/** `sort=-createdAt` 형태를 화이트리스트 기준으로 Prisma orderBy 절로 변환한다 */
export function toOrderBy(sort: string | undefined, allowedFields: string[], fallback: string) {
  const field = sort?.replace(/^-/, '') ?? fallback;
  const direction: SortOrder = sort?.startsWith('-') ? 'desc' : 'asc';
  const safeField = allowedFields.includes(field) ? field : fallback;
  return { [safeField]: direction };
}
