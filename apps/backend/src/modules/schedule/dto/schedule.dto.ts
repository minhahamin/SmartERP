import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ScheduleType, ScheduleVisibility } from '@prisma/client';

export class CreateScheduleDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ScheduleType })
  @IsEnum(ScheduleType)
  type: ScheduleType;

  @ApiProperty()
  @IsDateString()
  startAt: string;

  @ApiProperty()
  @IsDateString()
  endAt: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ enum: ScheduleVisibility, default: ScheduleVisibility.DEPARTMENT })
  @IsOptional()
  @IsEnum(ScheduleVisibility)
  visibility?: ScheduleVisibility;
}

export class UpdateScheduleDto extends PartialType(CreateScheduleDto) {}
