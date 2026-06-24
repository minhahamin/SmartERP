import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ArrayUnique, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateRoleDto extends PartialType(CreateRoleDto) {}

/** docs/02 2.3 — 관리자가 권한 관리 화면에서 토글하면 즉시 반영되는 RolePermission 일괄 교체 */
export class SetRolePermissionsDto {
  @ApiProperty({ type: [String] })
  @IsUUID('all', { each: true })
  @ArrayUnique()
  permissionIds: string[];
}
