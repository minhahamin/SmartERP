import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { LeaveType } from '@prisma/client';
import { HOURLY_TIME_SLOTS } from '../leave-constants';

export class CreateLeaveRequestDto {
  @ApiProperty({ enum: LeaveType })
  @IsEnum(LeaveType)
  type: LeaveType;

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiProperty()
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({
    enum: HOURLY_TIME_SLOTS,
    description: '시간반차(HOURLY) 전용 — 2시간 단위 시간 구간',
  })
  @IsOptional()
  @IsIn(HOURLY_TIME_SLOTS)
  timeSlot?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
