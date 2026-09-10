import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Audit } from '../../common/decorators/audit-log.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { DocumentQueryDto } from './dto/document-query.dto';
import { BulkDeleteDocumentsDto } from './dto/bulk-delete-documents.dto';

/** 허용 확장자/마임 화이트리스트 — 실행파일·스크립트 업로드 차단 */
const ALLOWED_MIMES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'text/plain',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.ms-excel',
]);
const ALLOWED_EXTS = new Set([
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.txt',
  '.csv',
  '.docx',
  '.xlsx',
  '.doc',
  '.xls',
]);

function documentFileFilter(
  _req: unknown,
  file: Express.Multer.File,
  cb: (err: Error | null, accept: boolean) => void,
) {
  const ext = `.${(file.originalname.split('.').pop() ?? '').toLowerCase()}`;
  if (!ALLOWED_MIMES.has(file.mimetype) || !ALLOWED_EXTS.has(ext)) {
    cb(new BadRequestException('허용되지 않은 파일 형식입니다 (pdf/이미지/office/txt/csv만 가능).'), false);
    return;
  }
  cb(null, true);
}

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

  @Get(':id/file')
  @RequirePermissions('DOCUMENT', 'READ')
  @ApiOperation({ summary: '인증 기반 원본 다운로드 (/uploads 직접 접근 대신 사용 권장)' })
  async download(@Param('id') id: string, @CurrentUser() user: AuthUser, @Res() res: Response) {
    const { stream, filename, mimetype } = await this.documentsService.openFileStream(id, user);
    res.setHeader('Content-Type', mimetype);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    (stream as NodeJS.ReadableStream).pipe(res);
  }

  @Post()
  @RequirePermissions('DOCUMENT', 'CREATE')
  @Audit('DOCUMENT_UPLOAD', 'DOCUMENT')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '업로드(multipart) → 비동기 RAG 색인 트리거' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024, files: 1 },
      fileFilter: documentFileFilter,
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.documentsService.upload(file, dto, user);
  }

  @Post(':id/versions')
  @RequirePermissions('DOCUMENT', 'UPDATE')
  @Audit('DOCUMENT_NEW_VERSION', 'DOCUMENT')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '새 버전 업로드' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024, files: 1 },
      fileFilter: documentFileFilter,
    }),
  )
  addVersion(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ) {
    return this.documentsService.addVersion(id, file, user);
  }

  @Post('bulk-delete')
  @RequirePermissions('DOCUMENT', 'DELETE')
  @Audit('DOCUMENT_BULK_DELETE', 'DOCUMENT')
  @ApiOperation({ summary: '문서 선택 삭제' })
  bulkRemove(@Body() dto: BulkDeleteDocumentsDto, @CurrentUser() user: AuthUser) {
    return this.documentsService.removeMany(dto.ids, user);
  }

  @Delete()
  @RequirePermissions('DOCUMENT', 'DELETE')
  @Audit('DOCUMENT_DELETE_ALL', 'DOCUMENT')
  @ApiOperation({ summary: '전체 문서 삭제' })
  removeAll(@CurrentUser() user: AuthUser) {
    return this.documentsService.removeAll(user);
  }

  @Delete(':id')
  @RequirePermissions('DOCUMENT', 'DELETE')
  @Audit('DOCUMENT_DELETE', 'DOCUMENT')
  @ApiOperation({ summary: '문서 삭제' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.documentsService.remove(id, user);
  }
}
