import { readFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PDFParse } from 'pdf-parse';
import { GoogleGenAI } from '@google/genai';
import { PrismaService } from '../../prisma/prisma.service';
import { retryTransient } from '../../common/utils/retry-transient';
import { chunkText } from './chunker';

/** document_chunks.embedding 컬럼이 vector(1536)이라 임베딩 출력 차원을 여기에 맞춘다 */
const EMBEDDING_DIMENSIONS = 1536;
const EMBED_BATCH_SIZE = 50;

export interface DocumentSearchHit {
  documentId: string;
  title: string;
  category: string;
  summary: string | null;
  /** 질문과 가장 가까운 본문 조각들 */
  passages: string[];
}

/**
 * docs/08-api-design.md 8.2 — "내부 서비스성 모듈". PDF 텍스트 추출 → Gemini 요약 → 청크 분할·임베딩 →
 * pgvector(DocumentChunk) 적재 → indexStatus 전이까지 맡고, 챗봇의 문서 시맨틱 검색(search)을 제공한다.
 */
@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly gemini: GoogleGenAI | null;
  private readonly model: string;
  private readonly embeddingModel: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    const apiKey = config.get<string>('GEMINI_API_KEY');
    this.gemini = apiKey ? new GoogleGenAI({ apiKey }) : null;
    this.model = config.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash';
    this.embeddingModel = config.get<string>('GEMINI_EMBEDDING_MODEL') ||'gemini-embedding-001';
  }

  /** 업로드/새 버전 등록 직후 호출자가 await 없이 fire-and-forget으로 호출한다 */
  async indexDocument(documentId: string): Promise<void> {
    await this.prisma.document.update({ where: { id: documentId }, data: { indexStatus: 'PROCESSING' } });

    try {
      const document = await this.prisma.document.findUniqueOrThrow({ where: { id: documentId } });

      if (document.fileType !== 'application/pdf') {
        await this.prisma.document.update({
          where: { id: documentId },
          data: { indexStatus: 'DONE', summary: null },
        });
        return;
      }

      if (!this.gemini) {
        this.logger.warn(`GEMINI_API_KEY 미설정 — documentId=${documentId} 색인 보류`);
        await this.prisma.document.update({ where: { id: documentId }, data: { indexStatus: 'FAILED' } });
        return;
      }

      const text = await this.extractText(document.fileUrl);
      const summary = text.trim()
        ? await this.summarize(text, document.title)
        : '문서에서 추출 가능한 텍스트가 없습니다.';

      // 요약과 임베딩이 모두 끝나야 DONE — 새 버전이면 이전 청크를 지우고 다시 적재한다
      await this.indexChunks(documentId, text);

      await this.prisma.document.update({
        where: { id: documentId },
        data: { indexStatus: 'DONE', summary },
      });
    } catch (error) {
      this.logger.error(
        `문서 색인 실패 documentId=${documentId}`,
        error instanceof Error ? error.stack : String(error),
      );
      await this.prisma.document.update({ where: { id: documentId }, data: { indexStatus: 'FAILED' } });
    }
  }

  private async extractText(fileUrl: string): Promise<string> {
    const filePath = join(process.cwd(), fileUrl.replace(/^\//, ''));
    const buffer = await readFile(filePath);
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  /** gemini-2.5-flash 컨텍스트 한도 내로 앞부분만 사용(포트폴리오 데모 범위 — 문서당 최대 약 12,000자) */
  private async summarize(text: string, title: string): Promise<string> {
    const truncated = text.slice(0, 12_000);
    const response = await retryTransient(() =>
      this.gemini!.models.generateContent({
        model: this.model,
        contents:
          '당신은 사내 문서를 한국어로 요약하는 어시스턴트입니다. 핵심 내용을 3~5문장으로 간결하게 요약하세요.\n\n' +
          `문서 제목: ${title}\n\n내용:\n${truncated}`,
      }),
    );
    return response.text?.trim() ?? '요약을 생성하지 못했습니다.';
  }

  private async indexChunks(documentId: string, text: string): Promise<void> {
    const chunks = chunkText(text);
    const embeddings = await this.embed(chunks, 'RETRIEVAL_DOCUMENT');

    await this.prisma.$transaction([
      this.prisma.documentChunk.deleteMany({ where: { documentId } }),
      ...chunks.map(
        (content, index) => this.prisma.$executeRaw`
          INSERT INTO document_chunks (id, "documentId", "chunkIndex", content, "tokenCount", embedding)
          VALUES (${randomUUID()}, ${documentId}, ${index}, ${content}, ${Math.ceil(content.length / 2)},
                  ${toVectorLiteral(embeddings[index])}::vector)`,
      ),
    ]);
  }

  /** 문서 외 용도(과거 대화 검색 등)에서 쓰는 단건 임베딩. 키가 없거나 호출이 실패하면 null — 호출자가 기능을 건너뛴다 */
  async embedText(text: string, taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY'): Promise<number[] | null> {
    if (!this.gemini || !text.trim()) return null;
    try {
      const [vector] = await this.embed([text], taskType);
      return vector;
    } catch (error) {
      this.logger.warn(`임베딩 실패: ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }

  private async embed(texts: string[], taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY'): Promise<number[][]> {
    const vectors: number[][] = [];
    for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
      const batch = texts.slice(i, i + EMBED_BATCH_SIZE);
      const response = await retryTransient(() =>
        this.gemini!.models.embedContent({
          model: this.embeddingModel,
          contents: batch,
          config: { taskType, outputDimensionality: EMBEDDING_DIMENSIONS },
        }),
      );
      const values = response.embeddings?.map((e) => e.values ?? []) ?? [];
      if (values.length !== batch.length || values.some((v) => v.length !== EMBEDDING_DIMENSIONS)) {
        throw new Error('임베딩 응답 개수 또는 차원이 요청과 다릅니다.');
      }
      vectors.push(...values);
    }
    return vectors;
  }

  /**
   * 질문과 의미가 가까운 본문 조각을 가진 문서를 가까운 순으로 돌려준다. 거리 임계값은 두지 않는다 —
   * gemini-embedding의 코사인 거리는 무관한 질문에서도 0.35~0.45에 몰려 관련 여부를 가르지 못하므로,
   * 관련성 판단은 본문 조각을 받은 모델에 맡긴다. 접근 범위(회사·공개/부서)는 SQL에서 건다.
   * 임베딩을 쓸 수 없거나(키 미설정) 호출이 실패하면 null을 돌려줘 호출자가 키워드 검색으로 대체하게 한다.
   */
  async search(
    companyId: string,
    departmentId: string | null,
    query: string,
    limit = 3,
  ): Promise<DocumentSearchHit[] | null> {
    if (!this.gemini || !query.trim()) return null;

    let queryVector: number[];
    try {
      [queryVector] = await this.embed([query], 'RETRIEVAL_QUERY');
    } catch (error) {
      this.logger.warn(`질문 임베딩 실패 — 키워드 검색으로 대체: ${error instanceof Error ? error.message : error}`);
      return null;
    }

    const vector = toVectorLiteral(queryVector);
    const rows = await this.prisma.$queryRaw<
      { documentId: string; title: string; category: string; summary: string | null; content: string; distance: number }[]
    >`
      SELECT d.id AS "documentId", d.title, d.category::text AS category, d.summary, c.content,
             (c.embedding <=> ${vector}::vector) AS distance
      FROM document_chunks c
      JOIN documents d ON d.id = c."documentId"
      WHERE d."companyId" = ${companyId}
        AND d."indexStatus" = 'DONE'
        AND (d."isPublic" = true ${departmentId ? Prisma.sql`OR d."departmentId" = ${departmentId}` : Prisma.empty})
      ORDER BY c.embedding <=> ${vector}::vector
      LIMIT ${limit * 3}`;

    const byDocument = new Map<string, DocumentSearchHit>();
    for (const row of rows) {
      const hit = byDocument.get(row.documentId) ?? {
        documentId: row.documentId,
        title: row.title,
        category: row.category,
        summary: row.summary,
        passages: [],
      };
      if (hit.passages.length < 2) hit.passages.push(row.content);
      byDocument.set(row.documentId, hit);
    }
    return [...byDocument.values()].slice(0, limit);
  }
}

/** pgvector 입력 문자열 형식 '[0.1,0.2,...]' */
export function toVectorLiteral(values: number[]): string {
  return `[${values.join(',')}]`;
}
