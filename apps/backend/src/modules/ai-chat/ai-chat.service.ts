import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenAI,
  createModelContent,
  createPartFromFunctionResponse,
  createUserContent,
  type Content,
} from '@google/genai';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { AiToolsService } from './ai-tools.service';
import { SendMessageDto } from './dto/send-message.dto';

const MODEL = 'gemini-2.5-flash';
const MAX_TOOL_TURNS = 4;
const HISTORY_LIMIT = 10;

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
    return this.prisma.chatMessage.findMany({ where: { sessionId }, orderBy: { createdAt: 'asc' } });
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
            },
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
          const result = await this.aiTools.execute(name, call.args ?? {}, requester);
          usedTools.push(name);
          toolResults.push({ tool: name, result });
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
        },
      });
    }

    return this.prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'ASSISTANT',
        content:
          '요청을 처리하는 중 도구 호출 한도를 초과했습니다. 질문을 더 구체적으로 나눠서 다시 시도해주세요.',
      },
    });
  }

  private async assertOwnSession(sessionId: string, requester: AuthUser) {
    const session = await this.prisma.chatSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('대화 세션을 찾을 수 없습니다.');
    if (session.userId !== requester.sub)
      throw new ForbiddenException('본인의 대화 세션만 조회할 수 있습니다.');
    return session;
  }
}
