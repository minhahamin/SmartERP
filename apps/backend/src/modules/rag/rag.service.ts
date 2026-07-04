import { readFile } from 'fs/promises';
import { join } from 'path';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PDFParse } from 'pdf-parse';
import { GoogleGenAI } from '@google/genai';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * docs/08-api-design.md 8.2 — "내부 서비스성 모듈". 문서 관리 화면의 "AI 색인상태 / AI 요약"에
 * 필요한 최소 범위(PDF 텍스트 추출 → Gemini 요약 → indexStatus 전이)만 구현한다.
 * pgvector 임베딩 적재(DocumentChunk)는 챗봇의 문서 시맨틱 검색(docs 09~11) 범위라 이번에는 다루지 않는다.
 */
@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly gemini: GoogleGenAI | null;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    const apiKey = config.get<string>('GEMINI_API_KEY');
    this.gemini = apiKey ? new GoogleGenAI({ apiKey }) : null;
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
    const response = await this.gemini!.models.generateContent({
      model: 'gemini-2.5-flash',
      contents:
        '당신은 사내 문서를 한국어로 요약하는 어시스턴트입니다. 핵심 내용을 3~5문장으로 간결하게 요약하세요.\n\n' +
        `문서 제목: ${title}\n\n내용:\n${truncated}`,
    });
    return response.text?.trim() ?? '요약을 생성하지 못했습니다.';
  }
}
