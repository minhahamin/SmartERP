import { Body, Controller, Get, Param, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Audit } from '../../common/decorators/audit-log.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { DocumentQueryDto } from './dto/document-query.dto';

/** docs/08-api-design.md 8.4.5 — 문서 관리 */
@ApiTags('Documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @RequirePermissions('DOCUMENT', 'READ')
  @ApiOperation({ summary: '문서 목록' })
  findAll(@Query() query: DocumentQueryDto, @CurrentUser() user: AuthUser) {
    return this.documentsService.findAll(query, user);
  }

  @Get(':id')
  @RequirePermissions('DOCUMENT', 'READ')
  @ApiOperation({ summary: '문서 상세/메타데이터' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.documentsService.findOne(id, user);
  }

  @Get(':id/summary')
  @RequirePermissions('DOCUMENT', 'READ')
  @ApiOperation({ summary: 'AI 요약 결과 조회' })
  getSummary(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.documentsService.getSummary(id, user);
  }

  @Post()
  @RequirePermissions('DOCUMENT', 'CREATE')
  @Audit('DOCUMENT_UPLOAD', 'DOCUMENT')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '업로드(multipart) → 비동기 RAG 색인 트리거' })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } }))
  upload(@UploadedFile() file: Express.Multer.File, @Body() dto: UploadDocumentDto, @CurrentUser() user: AuthUser) {
    return this.documentsService.upload(file, dto, user);
  }

  @Post(':id/versions')
  @RequirePermissions('DOCUMENT', 'UPDATE')
  @Audit('DOCUMENT_NEW_VERSION', 'DOCUMENT')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '새 버전 업로드' })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } }))
  addVersion(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthUser) {
    return this.documentsService.addVersion(id, file, user);
  }
}
