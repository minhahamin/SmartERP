import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ description: '로그인 유지 — true면 Refresh Token 만료를 30일로 연장 (docs/12.3)' })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
