import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { DocumentCategory } from '@prisma/client';

export class UploadDocumentDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ enum: DocumentCategory })
  @IsEnum(DocumentCategory)
  category: DocumentCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  folderId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPublic?: boolean;
}
