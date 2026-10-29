import { randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RagService, toVectorLiteral } from '../rag/rag.service';

export const MEMORY_MAX_COUNT = 30;
export const MEMORY_MAX_LENGTH = 200;
const PAST_QUESTION_MIN_LENGTH = 4;
const PAST_SEARCH_LIMIT = 5;

export interface PastQuestion {
  question: string;
  tools: string | null;
  askedAt: string;
}

/**
 * 챗봇의 장기 메모리. 두 갈래다.
 * 1) 명시적 기억(AiMemory): 사용자가 "기억해줘"라고 한 사실만 저장하고, 매 대화의 시스템 프롬프트에 넣는다.
 * 2) 과거 대화 검색(ChatTurnEmbedding): 지난 질문을 임베딩해 두고 의미가 가까운 것을 찾는다. 질문만 저장하고
 *    답변·조회 결과는 저장하지 않는다 — 값은 항상 현재 권한으로 도구를 다시 호출해 얻게 하려는 의도다.
 * 두 경우 모두 userId로만 조회하므로 다른 사용자의 메모리는 보이지 않는다.
 */
@Injectable()
export class AiMemoryService {
  private readonly logger = new Logger(AiMemoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rag: RagService,
  ) {}

  list(userId: string) {
    return this.prisma.aiMemory.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
  }

  async contents(userId: string): Promise<string[]> {
    return (await this.list(userId)).map((m) => m.content);
  }

  async remember(userId: string, fact: string) {
    const content = fact.trim().replace(/\s+/g, ' ');
    if (!content) return { error: '기억할 내용이 비어 있습니다.' };
    if (content.length > MEMORY_MAX_LENGTH) {
      return { error: `한 번에 기억할 수 있는 길이는 ${MEMORY_MAX_LENGTH}자까지입니다. 더 짧게 요약해서 다시 시도해주세요.` };
    }
    const existing = await this.list(userId);
    if (existing.some((m) => m.content === content)) return { saved: false, message: '이미 기억하고 있는 내용입니다.' };
    if (existing.length >= MEMORY_MAX_COUNT) {
      return { error: `기억은 최대 ${MEMORY_MAX_COUNT}개까지 저장됩니다. 불필요한 기억을 먼저 잊게 해주세요.` };
    }
    const created = await this.prisma.aiMemory.create({ data: { userId, content } });
    return { saved: true, id: created.id, content };
  }

  /** keyword가 들어간 기억을 지운다. 비어 있으면 아무것도 지우지 않는다(전체 삭제는 deleteAll로만) */
  async forget(userId: string, keyword: string) {
    const term = keyword.trim();
    if (!term) return { error: '잊을 내용을 알려주세요.' };
    const targets = (await this.list(userId)).filter((m) => m.content.includes(term));
    if (targets.length === 0) return { deleted: 0, message: '일치하는 기억이 없습니다.' };
    await this.prisma.aiMemory.deleteMany({ where: { userId, id: { in: targets.map((m) => m.id) } } });
    return { deleted: targets.length, removed: targets.map((m) => m.content) };
  }

  async removeOne(userId: string, id: string) {
    const { count } = await this.prisma.aiMemory.deleteMany({ where: { id, userId } });
    return { success: count > 0 };
  }

  async deleteAll(userId: string) {
    const [memories, turns] = await Promise.all([
      this.prisma.aiMemory.deleteMany({ where: { userId } }),
      this.prisma.chatTurnEmbedding.deleteMany({ where: { userId } }),
    ]);
    return { memories: memories.count, pastQuestions: turns.count };
  }

  /** 답변이 끝난 뒤 fire-and-forget으로 호출한다. 실패해도 대화에는 영향이 없어야 한다 */
  async recordTurn(userId: string, sessionId: string, question: string, tools: string[]): Promise<void> {
    const text = question.trim();
    if (text.length < PAST_QUESTION_MIN_LENGTH) return;
    try {
      const vector = await this.rag.embedText(text, 'RETRIEVAL_DOCUMENT');
      if (!vector) return;
      await this.prisma.$executeRaw`
        INSERT INTO chat_turn_embeddings (id, "userId", "sessionId", question, tools, embedding)
        VALUES (${randomUUID()}, ${userId}, ${sessionId}, ${text}, ${tools.length ? [...new Set(tools)].join(', ') : null},
                ${toVectorLiteral(vector)}::vector)`;
    } catch (error) {
      this.logger.warn(`대화 임베딩 저장 실패: ${error instanceof Error ? error.message : error}`);
    }
  }

  /** 현재 세션을 제외하고, 본인의 지난 질문 중 의미가 가까운 것을 가까운 순으로 돌려준다. 임베딩을 못 쓰면 null */
  async searchPast(userId: string, currentSessionId: string, query: string): Promise<PastQuestion[] | null> {
    const vector = await this.rag.embedText(query, 'RETRIEVAL_QUERY');
    if (!vector) return null;
    const literal = toVectorLiteral(vector);
    const rows = await this.prisma.$queryRaw<{ question: string; tools: string | null; createdAt: Date }[]>`
      SELECT question, tools, "createdAt"
      FROM chat_turn_embeddings
      WHERE "userId" = ${userId} AND "sessionId" <> ${currentSessionId}
      ORDER BY embedding <=> ${literal}::vector
      LIMIT ${PAST_SEARCH_LIMIT}`;
    return rows.map((r) => ({
      question: r.question,
      tools: r.tools,
      askedAt: new Date(r.createdAt.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10),
    }));
  }
}
