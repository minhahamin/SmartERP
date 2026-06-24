import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { AttendanceStatus } from '@prisma/client';

/** HR/Admin이 직원 근태를 수동으로 등록/정정할 때 사용 (docs/02 2.2 근태관리 CRUD) */
export class CreateAttendanceDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty()
  @IsDateString()
  workDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  checkInAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  checkOutAt?: string;

  @ApiPropertyOptional({ enum: AttendanceStatus })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;
}

export class UpdateAttendanceDto extends PartialType(CreateAttendanceDto) {}
