import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenAI,
  createModelContent,
  createPartFromFunctionResponse,
  createUserContent,
  type Content,
} from '@google/genai';
import type { Prisma, ProductionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { LeaveService } from '../leave/leave.service';
import { LEAVE_TYPE_LABEL } from '../leave/leave-constants';
import { AnnouncementsService } from '../announcements/announcements.service';
import { ProductionService } from '../production/production.service';
import { createKoreanPdfDoc, pdfDocToBuffer } from '../../common/utils/korean-pdf';
import { AiToolsService } from './ai-tools.service';
import { SendMessageDto } from './dto/send-message.dto';

/** AI가 만든 초안은 "지금 답변 기준" 최신 정보로만 실행되어야 하므로, 오래된 제안은 재확인을 요구한다. */
const ACTION_DRAFT_TTL_MS = 10 * 60 * 1000;

const MODEL = 'gemini-2.5-flash';
const MAX_TOOL_TURNS = 4;
const HISTORY_LIMIT = 10;
/** FAQ 후보 생성 1회 실행당 분석할 최근 사용자 질문 개수 상한(비용 가드) */
const FAQ_ANALYSIS_LIMIT = 300;

/** PDF 내보내기용 "라벨: 값" 한 줄을 쓴다 */
function writeField(doc: PDFKit.PDFDocument, label: string, value: string): void {
  doc.font('Pretendard-Bold').text(`${label}  `, { continued: true }).font('Pretendard').text(value);
  doc.moveDown(0.4);
}

const SYSTEM_PROMPT_LINES = [
  '당신은 사내 ERP 업무 도우미 "ERPilot AI"입니다.',
  '',
  '[행동 원칙]',
  '1. 반드시 제공된 도구(tool)를 호출해서 얻은 실제 데이터에 근거해서만 답변한다. 도구를 호출하지 않고 추측한 숫자나 사실을 답변에 포함하지 않는다.',
  '2. 질문에 맞는 도구가 없거나, 도구 호출 결과가 비어있거나 대상을 찾지 못한 경우 "해당 데이터가 없습니다" 또는 "확인할 수 없습니다"라고 솔직하게 답한다. 절대로 답을 지어내지 않는다.',
  '3. 도구 실행 결과에 권한 오류가 포함되어 있으면, 그 사실을 근거로 정중히 안내한다(예: 본인 권한으로는 조회할 수 없는 데이터).',
  '4. 답변은 간결한 핵심 요약으로 시작하고, 필요하면 목록으로 세부 내용을 정리한다. 불필요한 서론은 생략한다.',
  '5. 문서 검색 결과를 인용할 때는 문서 제목을 함께 언급한다.',
  '6. 도구 인자(예: 제품명, 직원명, 거래처명)는 반드시 사용자가 실제로 언급한 값만 사용한다. 사용자가 특정 이름을 언급하지 않았다면 그 인자를 비워두고 호출하거나(예: 이름 없이 본인 기준 조회), 이름을 지어내지 말고 "전체/목록" 성격의 도구(예: 안전재고 미달 전체 조회)를 사용한다.',
];

/**
 * docs/09-ai-chatbot-design.md의 Function Calling 오케스트레이션을 Gemini(gemini-2.5-flash)로 구현한다.
 * pgvector 기반 시맨틱 검색(docs 10-11)은 별도 범위라, 문서 검색 도구는 title/summary 키워드 매칭으로 대체한다.
 */
@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);
  private readonly gemini: GoogleGenAI | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiTools: AiToolsService,
    private readonly leaveService: LeaveService,
    private readonly announcementsService: AnnouncementsService,
    private readonly productionService: ProductionService,
    config: ConfigService,
  ) {
    const apiKey = config.get<string>('GEMINI_API_KEY');
    this.gemini = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }

  listSessions(userId: string) {
    return this.prisma.chatSession.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } });
  }

  createSession(userId: string, title?: string) {
    return this.prisma.chatSession.create({ data: { userId, title } });
  }

  async listMessages(sessionId: string, requester: AuthUser) {
    await this.assertOwnSession(sessionId, requester);
    return this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      include: { actionDraft: true },
    });
  }

  /** ChatMessage는 ChatSession에 onDelete: Cascade로 걸려있어 메시지도 함께 삭제된다 */
  async deleteSession(sessionId: string, requester: AuthUser) {
    await this.assertOwnSession(sessionId, requester);
    await this.prisma.chatSession.delete({ where: { id: sessionId } });
    return { success: true };
  }

  async sendMessage(sessionId: string, dto: SendMessageDto, requester: AuthUser) {
    const session = await this.assertOwnSession(sessionId, requester);
    await this.prisma.chatMessage.create({ data: { sessionId, role: 'USER', content: dto.content } });
    await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: session.title ? {} : { title: dto.content.slice(0, 24) },
    });

    return this.generateReply(sessionId, dto.content, requester);
  }

  async listFaq(category: string | undefined, requester: AuthUser) {
    return this.prisma.faqItem.findMany({
      where: { companyId: requester.companyId, isPublished: true, ...(category ? { category } : {}) },
      orderBy: { hitCount: 'desc' },
    });
  }

  /** FAQ 관리 화면의 "검수 대기" 목록 — 자동 생성 후보 + 사람이 만든 미게시 초안 모두 포함 */
  async listFaqDrafts(requester: AuthUser) {
    return this.prisma.faqItem.findMany({
      where: { companyId: requester.companyId, isPublished: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Human-in-the-loop: AI/사용자가 올린 초안은 isPublished=false로 대기, 검수 후 게시 */
  async createFaqDraft(dto: { question: string; answer: string; category?: string }, requester: AuthUser) {
    return this.prisma.faqItem.create({
      data: {
        companyId: requester.companyId,
        question: dto.question,
        answer: dto.answer,
        category: dto.category,
        sourceType: 'MANUAL',
        isPublished: false,
      },
    });
  }

  async publishFaq(id: string, requester: AuthUser) {
    const item = await this.prisma.faqItem.findFirst({ where: { id, companyId: requester.companyId } });
    if (!item) throw new NotFoundException('FAQ를 찾을 수 없습니다.');
    if (item.isPublished) return item;
    return this.prisma.faqItem.update({ where: { id }, data: { isPublished: true } });
  }

  async rejectFaq(id: string, requester: AuthUser) {
    const item = await this.prisma.faqItem.findFirst({ where: { id, companyId: requester.companyId } });
    if (!item) throw new NotFoundException('FAQ를 찾을 수 없습니다.');
    await this.prisma.faqItem.delete({ where: { id } });
    return { success: true };
  }

  /**
   * docs/09-ai-chatbot-design.md 9.1 "비동기: FAQ 후보 클러스터링 큐 적재"를 별도 큐/임베딩 인프라 없이
   * Gemini 한 번 호출로 구현한다(이 프로젝트 전반의 방침 — RAG도 pgvector 대신 키워드 매칭으로 단순화했듯,
   * "의도 클러스터링"도 전용 ML 파이프라인 대신 LLM에 위임한다). 문자 그대로 반복된 질문은 서버에서 먼저
   * 집계하고, 표현이 달라도 의도가 같은 질문을 묶는 것만 모델에 맡긴 뒤, threshold 재검증·중복 방지는
   * 서버가 맡는다(모델 출력을 그대로 신뢰하지 않는다는 이 프로젝트의 일관된 원칙, ai-tools.service.ts 참고).
   * 실행은 사람이 관리 화면/API로 트리거하는 온디맨드 방식이다(별도 큐/스케줄러 인프라가 없음).
   */
  async generateFaqCandidates(requester: AuthUser, threshold = 5) {
    if (!this.gemini) {
      throw new BadRequestException('GEMINI_API_KEY가 설정되지 않아 FAQ 자동 생성을 사용할 수 없습니다.');
    }

    const messages = await this.prisma.chatMessage.findMany({
      where: { role: 'USER', session: { user: { companyId: requester.companyId } } },
      select: { content: true },
      orderBy: { createdAt: 'desc' },
      take: FAQ_ANALYSIS_LIMIT,
    });
    if (messages.length === 0) {
      return { analyzedMessages: 0, distinctQuestions: 0, candidatesCreated: 0, candidates: [] };
    }

    const countByNormalized = new Map<string, { sample: string; count: number }>();
    for (const m of messages) {
      const normalized = m.content.trim().toLowerCase().replace(/[?!.\s]+$/g, '');
      if (!normalized) continue;
      const existing = countByNormalized.get(normalized);
      if (existing) existing.count += 1;
      else countByNormalized.set(normalized, { sample: m.content.trim(), count: 1 });
    }
    const questionCounts = [...countByNormalized.values()];

    const prompt = [
      `아래는 사내 ERP 챗봇에 실제로 들어온 사용자 질문과, 완전히 동일한 문장이 반복된 횟수입니다.`,
      `표현은 다르지만 실질적으로 같은 의도를 묻는 질문들을 하나의 그룹으로 묶고,`,
      `그룹에 속한 질문들의 횟수 합이 ${threshold} 이상인 그룹만 골라주세요.`,
      `각 그룹마다 대표 질문 하나(representativeQuestion), 그 질문에 대한 간결한 한국어 답변(answer, 2~3문장),`,
      `분류(category, 예: 인사/휴가/급여/재고/영업/생산/기타), 그룹의 총 횟수 합(matchedCount)을 만들어주세요.`,
      `답변에는 이 회사의 실제 수치나 이름을 지어내지 말고, 일반적으로 안전한 안내(어느 화면에서 확인하는지, 누구에게 문의하는지 등) 위주로 작성하세요.`,
      `기준(${threshold}회 이상)을 만족하는 그룹이 없으면 빈 배열을 반환하세요.`,
      `정확히 이 JSON 스키마의 배열로만 응답하세요: [{ "representativeQuestion": string, "answer": string, "category": string, "matchedCount": number }]`,
      '',
      '질문 목록(질문 | 횟수):',
      ...questionCounts.map((q) => `- ${q.sample} | ${q.count}`),
    ].join('\n');

    const response = await this.gemini.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    let clusters: { representativeQuestion: string; answer: string; category: string; matchedCount: number }[];
    try {
      clusters = JSON.parse(response.text ?? '[]');
    } catch (error) {
      this.logger.error('FAQ 클러스터링 응답 파싱 실패', error instanceof Error ? error.stack : String(error));
      throw new BadRequestException('FAQ 후보 생성 응답을 해석하지 못했습니다. 다시 시도해주세요.');
    }

    const existing = await this.prisma.faqItem.findMany({
      where: { companyId: requester.companyId },
      select: { question: true },
    });
    const existingQuestions = new Set(existing.map((f) => f.question.trim().toLowerCase()));

    const created: { id: string; question: string }[] = [];
    for (const cluster of clusters) {
      // 모델이 만든 matchedCount를 그대로 신뢰하지 않고 임계치를 서버에서 다시 확인한다(2차 방어).
      if (!cluster.representativeQuestion || !cluster.answer || cluster.matchedCount < threshold) continue;
      const key = cluster.representativeQuestion.trim().toLowerCase();
      if (existingQuestions.has(key)) continue;

      const item = await this.prisma.faqItem.create({
        data: {
          companyId: requester.companyId,
          question: cluster.representativeQuestion.trim(),
          answer: cluster.answer.trim(),
          category: cluster.category || undefined,
          sourceType: 'AI_GENERATED',
          isPublished: false,
        },
      });
      existingQuestions.add(key);
      created.push({ id: item.id, question: item.question });
    }

    return {
      analyzedMessages: messages.length,
      distinctQuestions: questionCounts.length,
      candidatesCreated: created.length,
      candidates: created,
    };
  }

  private async generateReply(sessionId: string, userMessage: string, requester: AuthUser) {
    if (!this.gemini) {
      return this.prisma.chatMessage.create({
        data: {
          sessionId,
          role: 'ASSISTANT',
          content: 'AI 응답 파이프라인이 설정되지 않았습니다. 관리자에게 GEMINI_API_KEY 설정을 요청해주세요.',
        },
      });
    }

    const history = await this.prisma.chatMessage.findMany({
      where: { sessionId, role: { in: ['USER', 'ASSISTANT'] } },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LIMIT,
    });
    const contents: Content[] = history
      .reverse()
      .map((m) => (m.role === 'USER' ? createUserContent(m.content) : createModelContent(m.content)));

    const declarations = await this.aiTools.getDeclarations(requester, userMessage);
    const usedTools: string[] = [];
    const toolResults: Array<{ tool: string; result: unknown }> = [];
    let totalTokens = 0;
    // draftLeaveRequest처럼 "제안"을 만드는 도구가 이 턴에서 실행되면 마지막 draftId를 기억해뒀다가
    // 최종 ASSISTANT 메시지에 매달아, 프론트가 확인/취소 카드를 그 메시지 아래에 렌더링하게 한다.
    let lastDraftId: string | undefined;

    let turn = 0;
    try {
      while (turn < MAX_TOOL_TURNS) {
        const response = await this.gemini.models.generateContent({
          model: MODEL,
          contents,
          config: {
            systemInstruction: SYSTEM_PROMPT_LINES.join('\n'),
            tools: declarations.length > 0 ? [{ functionDeclarations: declarations }] : undefined,
          },
        });
        totalTokens += response.usageMetadata?.totalTokenCount ?? 0;

        const calls = response.functionCalls ?? [];
        if (calls.length === 0) {
          const text = response.text?.trim() || '답변을 생성하지 못했습니다.';
          return this.prisma.chatMessage.create({
            data: {
              sessionId,
              role: 'ASSISTANT',
              content: text,
              functionName: usedTools.length > 0 ? usedTools.join(', ') : null,
              functionResult:
                usedTools.length > 0 ? (toolResults as unknown as Prisma.InputJsonValue) : undefined,
              tokenUsage: totalTokens,
              actionDraftId: lastDraftId,
            },
            include: { actionDraft: true },
          });
        }

        // Gemini의 "thinking" 모델은 함수 호출 응답에 thought_signature를 포함하는데, 다음 턴에
        // 그대로 되돌려주지 않으면 400 오류가 난다. 그래서 인자만으로 새로 만들지 않고 모델이 반환한
        // Content(candidates[0].content)를 그대로 히스토리에 이어붙인다.
        const modelContent = response.candidates?.[0]?.content ?? createModelContent('');
        contents.push(modelContent);

        const responseParts = [];
        for (const call of calls) {
          const name = call.name ?? '';
          const result = await this.aiTools.execute(name, call.args ?? {}, requester, sessionId);
          usedTools.push(name);
          toolResults.push({ tool: name, result });
          if (result && typeof result === 'object' && 'draftId' in result) {
            lastDraftId = (result as { draftId: string }).draftId;
          }
          responseParts.push(createPartFromFunctionResponse(call.id ?? name, name, { result }));
        }
        contents.push(createUserContent(responseParts));
        turn++;
      }
    } catch (error) {
      this.logger.error('Gemini 응답 생성 실패', error instanceof Error ? error.stack : String(error));
      return this.prisma.chatMessage.create({
        data: {
          sessionId,
          role: 'ASSISTANT',
          content: 'AI 응답을 생성하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
          tokenUsage: totalTokens,
        },
      });
    }

    return this.prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'ASSISTANT',
        content:
          '요청을 처리하는 중 도구 호출 한도를 초과했습니다. 질문을 더 구체적으로 나눠서 다시 시도해주세요.',
        tokenUsage: totalTokens,
      },
    });
  }

  /**
   * "확인" 버튼 → 초안을 실제 도메인 서비스 호출로 확정한다. LeaveService.create()를 그대로
   * 호출하므로 수동으로 "휴가 신청" 화면에서 신청하는 것과 완전히 동일한 검증/잔액체크/트랜잭션을 탄다.
   */
  async confirmAction(draftId: string, requester: AuthUser) {
    const draft = await this.getOwnedPendingDraft(draftId, requester);

    switch (draft.actionType) {
      case 'LEAVE_REQUEST': {
        const payload = draft.payload as {
          type: 'ANNUAL' | 'HALF_DAY_AM' | 'HALF_DAY_PM' | 'HOURLY' | 'SICK' | 'SPECIAL' | 'UNPAID';
          startDate: string;
          endDate: string;
          timeSlot?: string;
          reason?: string;
        };
        const created = await this.leaveService.create(payload, requester);
        return this.prisma.aiActionDraft.update({
          where: { id: draftId },
          data: { status: 'CONFIRMED', confirmedAt: new Date(), resultingRecordId: created.id },
        });
      }
      case 'ANNOUNCEMENT': {
        const payload = draft.payload as { title: string; content: string; category?: string; isPinned?: boolean };
        const created = await this.announcementsService.create(payload, requester);
        return this.prisma.aiActionDraft.update({
          where: { id: draftId },
          data: { status: 'CONFIRMED', confirmedAt: new Date(), resultingRecordId: created.id },
        });
      }
      case 'PRODUCTION_STATUS_UPDATE': {
        const payload = draft.payload as { productionOrderId: string; status: ProductionStatus; producedQty?: number };
        const updated = await this.productionService.updateStatus(
          payload.productionOrderId,
          { status: payload.status, producedQty: payload.producedQty },
          requester,
        );
        return this.prisma.aiActionDraft.update({
          where: { id: draftId },
          data: { status: 'CONFIRMED', confirmedAt: new Date(), resultingRecordId: updated.id },
        });
      }
      default:
        throw new BadRequestException(`지원하지 않는 액션 유형입니다: ${draft.actionType}`);
    }
  }

  async rejectAction(draftId: string, requester: AuthUser) {
    await this.getOwnedPendingDraft(draftId, requester);
    return this.prisma.aiActionDraft.update({ where: { id: draftId }, data: { status: 'REJECTED' } });
  }

  /**
   * 공지/휴가 초안을 PDF로 내려받는다. confirm과 달리 상태(PENDING/CONFIRMED/…)나 TTL과 무관하게
   * "본인 제안"이기만 하면 언제든 문서로 남길 수 있어야 하므로 getOwnedPendingDraft를 쓰지 않는다.
   */
  async exportActionDraftPdf(draftId: string, requester: AuthUser): Promise<Buffer> {
    const draft = await this.prisma.aiActionDraft.findUnique({ where: { id: draftId } });
    if (!draft) throw new NotFoundException('액션 제안을 찾을 수 없습니다.');
    if (draft.userId !== requester.sub) throw new ForbiddenException('본인이 요청한 제안만 내려받을 수 있습니다.');

    const doc = createKoreanPdfDoc();
    const STATUS_LABEL: Record<string, string> = {
      PENDING: '확인 대기',
      CONFIRMED: '접수 완료',
      REJECTED: '취소됨',
      EXPIRED: '만료됨',
    };

    if (draft.actionType === 'LEAVE_REQUEST') {
      const p = draft.payload as {
        type: string;
        startDate: string;
        endDate: string;
        timeSlot?: string;
        reason?: string;
      };
      const requesterUser = await this.prisma.user.findUnique({ where: { id: draft.userId } });
      const period = p.startDate === p.endDate ? p.startDate : `${p.startDate} ~ ${p.endDate}`;
      doc.font('Pretendard-Bold').fontSize(20).text('휴가 신청서');
      doc.moveDown(1.5);
      doc.font('Pretendard').fontSize(11);
      writeField(doc, '신청자', requesterUser?.name ?? '-');
      writeField(doc, '휴가 유형', LEAVE_TYPE_LABEL[p.type as keyof typeof LEAVE_TYPE_LABEL] ?? p.type);
      writeField(doc, '기간', period);
      if (p.timeSlot) writeField(doc, '시간', p.timeSlot);
      if (p.reason) writeField(doc, '사유', p.reason);
      writeField(doc, '상태', STATUS_LABEL[draft.status] ?? draft.status);
      writeField(doc, '작성일', draft.createdAt.toISOString().slice(0, 10));
    } else if (draft.actionType === 'ANNOUNCEMENT') {
      const p = draft.payload as { title: string; content: string; category?: string; isPinned?: boolean };
      doc.font('Pretendard-Bold').fontSize(20).text('공지사항');
      doc.moveDown(1.5);
      doc.font('Pretendard').fontSize(11);
      writeField(doc, '제목', p.title);
      if (p.category) writeField(doc, '분류', p.category);
      writeField(doc, '상단 고정', p.isPinned ? '예' : '아니오');
      writeField(doc, '상태', STATUS_LABEL[draft.status] ?? draft.status);
      writeField(doc, '작성일', draft.createdAt.toISOString().slice(0, 10));
      doc.moveDown(1);
      doc.font('Pretendard-Bold').fontSize(12).text('내용');
      doc.moveDown(0.3);
      doc.font('Pretendard').fontSize(11).text(p.content, { lineGap: 4 });
    } else {
      throw new BadRequestException(`'${draft.actionType}' 유형은 PDF로 내려받을 수 없습니다.`);
    }

    return pdfDocToBuffer(doc);
  }

  private async getOwnedPendingDraft(draftId: string, requester: AuthUser) {
    const draft = await this.prisma.aiActionDraft.findUnique({ where: { id: draftId } });
    if (!draft) throw new NotFoundException('액션 제안을 찾을 수 없습니다.');
    if (draft.userId !== requester.sub)
      throw new ForbiddenException('본인이 요청한 제안만 처리할 수 있습니다.');
    if (draft.status !== 'PENDING') throw new BadRequestException('이미 처리된 제안입니다.');

    if (Date.now() - draft.createdAt.getTime() > ACTION_DRAFT_TTL_MS) {
      await this.prisma.aiActionDraft.update({ where: { id: draftId }, data: { status: 'EXPIRED' } });
      throw new BadRequestException('제안이 만료되었습니다. 채팅에서 다시 요청해주세요.');
    }
    return draft;
  }

  private async assertOwnSession(sessionId: string, requester: AuthUser) {
    const session = await this.prisma.chatSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('대화 세션을 찾을 수 없습니다.');
    if (session.userId !== requester.sub)
      throw new ForbiddenException('본인의 대화 세션만 조회할 수 있습니다.');
    return session;
  }
}
