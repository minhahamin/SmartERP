import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/interfaces/paginated-result.interface';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { RagService } from '../rag/rag.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { DocumentQueryDto } from './dto/document-query.dto';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'documents');

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ragService: RagService,
  ) {}

  async findAll(query: DocumentQueryDto, requester: AuthUser) {
    const where: Record<string, unknown> = { companyId: requester.companyId };
    if (query.category) where.category = query.category;
    if (query.folderId) where.folderId = query.folderId;
    if (query.search) where.title = { contains: query.search, mode: 'insensitive' };

    const [items, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.document.count({ where }),
    ]);
    return paginate(items, total, query.page, query.limit);
  }

  async findOne(id: string, requester: AuthUser) {
    const document = await this.prisma.document.findFirst({ where: { id, companyId: requester.companyId } });
    if (!document) throw new NotFoundException('문서를 찾을 수 없습니다.');
    return document;
  }

  /**
   * docs/13-system-architecture.md는 S3 Presigned URL 업로드를 전제하지만, 실제 AWS 연동은
   * 범위 밖이라 로컬 디스크에 저장한다. 저장 직후 RagService.indexDocument를 await 없이 호출해
   * PDF 텍스트 추출 → AI 요약까지 비동기로 진행하고, 프론트는 indexStatus를 폴링해 완료를 확인한다.
   */
  async upload(file: Express.Multer.File, dto: UploadDocumentDto, requester: AuthUser) {
    if (!file) throw new BadRequestException('업로드할 파일이 없습니다.');
    const fileUrl = await this.saveFile(file);

    const document = await this.prisma.document.create({
      data: {
        companyId: requester.companyId,
        folderId: dto.folderId,
        title: dto.title,
        category: dto.category,
        fileUrl,
        fileType: file.mimetype,
        fileSize: file.size,
        isPublic: dto.isPublic ?? true,
        departmentId: dto.departmentId,
        uploadedBy: requester.sub,
        status: 'PUBLISHED',
        indexStatus: 'PENDING',
      },
    });
    this.triggerIndexing(document.id);
    return document;
  }

  async addVersion(id: string, file: Express.Multer.File, requester: AuthUser) {
    if (!file) throw new BadRequestException('업로드할 파일이 없습니다.');
    const document = await this.findOne(id, requester);
    const fileUrl = await this.saveFile(file);

    const updated = await this.prisma.document.update({
      where: { id },
      data: {
        fileUrl,
        fileType: file.mimetype,
        fileSize: file.size,
        version: document.version + 1,
        indexStatus: 'PENDING',
        summary: null,
      },
    });
    this.triggerIndexing(id);
    return updated;
  }

  async getSummary(id: string, requester: AuthUser) {
    const document = await this.findOne(id, requester);
    if (document.indexStatus !== 'DONE') {
      return {
        documentId: id,
        summary: null,
        message:
          document.indexStatus === 'FAILED'
            ? 'AI 색인에 실패했습니다.'
            : '색인이 진행 중입니다. 완료 후 AI 요약을 제공합니다.',
      };
    }
    return { documentId: id, summary: document.summary, message: null };
  }

  async remove(id: string, requester: AuthUser) {
    const document = await this.findOne(id, requester);
    await this.prisma.document.delete({ where: { id } });
    await this.deleteFile(document.fileUrl);
    return { success: true };
  }

  async removeMany(ids: string[], requester: AuthUser) {
    const documents = await this.prisma.document.findMany({
      where: { id: { in: ids }, companyId: requester.companyId },
    });
    await this.prisma.document.deleteMany({ where: { id: { in: documents.map((d) => d.id) } } });
    await Promise.all(documents.map((d) => this.deleteFile(d.fileUrl)));
    return { success: true };
  }

  async removeAll(requester: AuthUser) {
    const documents = await this.prisma.document.findMany({ where: { companyId: requester.companyId } });
    await this.prisma.document.deleteMany({ where: { companyId: requester.companyId } });
    await Promise.all(documents.map((d) => this.deleteFile(d.fileUrl)));
    return { success: true };
  }

  private triggerIndexing(documentId: string): void {
    this.ragService.indexDocument(documentId).catch((error) => {
      this.logger.error(
        `색인 트리거 실패 documentId=${documentId}`,
        error instanceof Error ? error.stack : String(error),
      );
    });
  }

  private async saveFile(file: Express.Multer.File): Promise<string> {
    await mkdir(UPLOAD_DIR, { recursive: true });
    // multer는 multipart 파일명을 latin1로 디코딩한다 — 비ASCII 원본 파일명은 utf8로 다시 해석해야 한다.
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const fileName = `${randomUUID()}-${originalName}`;
    await writeFile(join(UPLOAD_DIR, fileName), file.buffer);
    return `/uploads/documents/${fileName}`;
  }

  private async deleteFile(fileUrl: string): Promise<void> {
    try {
      await unlink(join(process.cwd(), fileUrl.replace(/^\//, '')));
    } catch {
      // 파일이 이미 없어도 DB 정합성 삭제가 우선이므로 무시한다
    }
  }
}
