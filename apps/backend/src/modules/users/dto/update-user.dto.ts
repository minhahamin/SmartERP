import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { UserStatus } from '@prisma/client';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({ enum: UserStatus, description: '퇴사 처리는 DELETE 대신 status=RESIGNED로 소프트 삭제 (docs/07 7.6 #2)' })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}

/** docs/02 2.2 — EMPLOYEE는 "R(own), U(own 일부 항목)"만 가능. 본인 수정 시 허용되는 필드만 분리 */
export const SELF_EDITABLE_FIELDS = ['phone', 'email'] as const;
