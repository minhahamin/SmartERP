import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * docs/08-api-design.md 8.2 — "내부 서비스성 모듈"(Chunking/Embedding 파이프라인), 컨트롤러 없음.
 * 실제 텍스트 추출/Chunking/Embedding/유사도 검색 구현은 docs/09~11(RAG·pgvector 설계) 범위이며
 * 이번 작업(docs/02·07·08·12·13·14 기준 구조 작업)에서는 연동하지 않은 자리표시자다.
 * docs/13 흐름상 BullMQ Worker가 이 서비스를 호출해 DocumentChunk를 적재하게 된다.
 */
@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(private readonly prisma: PrismaService) {}

  async indexDocument(documentId: string): Promise<void> {
    this.logger.warn(`RAG 색인 파이프라인 미연동 — documentId=${documentId} (docs/10-11 구현 필요)`);
    await this.prisma.document.update({ where: { id: documentId }, data: { indexStatus: 'PENDING' } });
  }
}
