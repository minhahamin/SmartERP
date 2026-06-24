import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ description: '회사명' })
  @IsString()
  companyName: string;

  @ApiProperty({ description: '사업자등록번호' })
  @IsString()
  bizRegNo: string;

  @ApiProperty({ description: '최초 가입자(관리자) 이름' })
  @IsString()
  adminName: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string;
}
