import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { DocumentFoldersService } from './document-folders.service';
import { DocumentFolderDto } from './dto/document-folder.dto';

/** 문서 관리 화면의 폴더 트리 — docs/08 8.4.5 범위 밖이라 DOCUMENT 리소스 권한을 그대로 재사용한다 */
@ApiTags('Documents')
@ApiBearerAuth()
@Controller('document-folders')
export class DocumentFoldersController {
  constructor(private readonly documentFoldersService: DocumentFoldersService) {}

  @Get()
  @RequirePermissions('DOCUMENT', 'READ')
  @ApiOperation({ summary: '문서 폴더 목록' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.documentFoldersService.findAll(user);
  }

  @Post()
  @RequirePermissions('DOCUMENT', 'CREATE')
  @ApiOperation({ summary: '문서 폴더 생성' })
  create(@Body() dto: DocumentFolderDto, @CurrentUser() user: AuthUser) {
    return this.documentFoldersService.create(dto, user);
  }

  @Patch(':id')
  @RequirePermissions('DOCUMENT', 'UPDATE')
  @ApiOperation({ summary: '문서 폴더명 수정' })
  update(@Param('id') id: string, @Body() dto: DocumentFolderDto, @CurrentUser() user: AuthUser) {
    return this.documentFoldersService.update(id, dto, user);
  }

  @Delete(':id')
  @RequirePermissions('DOCUMENT', 'DELETE')
  @ApiOperation({ summary: '문서 폴더 삭제(문서가 없을 때만)' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.documentFoldersService.remove(id, user);
  }
}
