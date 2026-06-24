import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/interfaces/paginated-result.interface';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { DocumentQueryDto } from './dto/document-query.dto';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'documents');

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: DocumentQueryDto, requester: AuthUser) {
    const where: Record<string, unknown> = { companyId: requester.companyId };
    if (query.category) where.category = query.category;
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
   * 범위 밖이라 로컬 디스크에 저장한다. indexStatus=PENDING으로 두면 docs/10-11(RAG 파이프라인,
   * 이번 작업 범위 밖)의 Worker가 이어서 Chunking/Embedding을 수행하는 지점이 된다.
   */
  async upload(file: Express.Multer.File, dto: UploadDocumentDto, requester: AuthUser) {
    if (!file) throw new BadRequestException('업로드할 파일이 없습니다.');
    const fileUrl = await this.saveFile(file);

    return this.prisma.document.create({
      data: {
        companyId: requester.companyId,
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
  }

  async addVersion(id: string, file: Express.Multer.File, requester: AuthUser) {
    if (!file) throw new BadRequestException('업로드할 파일이 없습니다.');
    const document = await this.findOne(id, requester);
    const fileUrl = await this.saveFile(file);

    return this.prisma.document.update({
      where: { id },
      data: {
        fileUrl,
        fileType: file.mimetype,
        fileSize: file.size,
        version: document.version + 1,
        indexStatus: 'PENDING',
      },
    });
  }

  async getSummary(id: string, requester: AuthUser) {
    const document = await this.findOne(id, requester);
    if (document.indexStatus !== 'DONE') {
      return { documentId: id, summary: null, message: '색인이 진행 중입니다. 완료 후 AI 요약을 제공합니다.' };
    }
    // AI 요약 생성/저장은 docs/09~11(RAG 파이프라인) 범위 — 이번 작업에서는 미연동
    return { documentId: id, summary: null, message: 'AI 요약 기능은 RAG 파이프라인 연동 후 제공됩니다.' };
  }

  private async saveFile(file: Express.Multer.File): Promise<string> {
    await mkdir(UPLOAD_DIR, { recursive: true });
    const fileName = `${randomUUID()}-${file.originalname}`;
    await writeFile(join(UPLOAD_DIR, fileName), file.buffer);
    return `/uploads/documents/${fileName}`;
  }
}
