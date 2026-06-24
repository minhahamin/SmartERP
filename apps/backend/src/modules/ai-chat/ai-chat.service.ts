import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { SendMessageDto } from './dto/send-message.dto';

/** docs/09~11(Function Calling/RAG/pgvector)이 실제로 구현되기 전까지 노출하는 안내 문구 */
const AI_NOT_WIRED_MESSAGE = 'AI 응답 생성 파이프라인은 아직 연동되지 않았습니다. (docs/09~11 RAG·Function Calling 설계 구현 필요)';

@Injectable()
export class AiChatService {
  constructor(private readonly prisma: PrismaService) {}

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

  /**
   * docs/08.4.6 — SSE 스트리밍 응답. 실제 GPT-4o Function Calling 오케스트레이션(docs/09)은
   * 이번 작업 범위 밖이라, 사용자 메시지는 정상 저장하고 안내 문구 한 건을 스트리밍 흉내로 반환한다.
   */
  streamReply(sessionId: string, dto: SendMessageDto, requester: AuthUser): Observable<{ data: string }> {
    return new Observable((subscriber) => {
      this.handleMessage(sessionId, dto, requester)
        .then((assistantMessage) => {
          subscriber.next({ data: JSON.stringify(assistantMessage) });
          subscriber.complete();
        })
        .catch((error: unknown) => subscriber.error(error));
    });
  }

  async listFaq(category: string | undefined, requester: AuthUser) {
    return this.prisma.faqItem.findMany({
      where: { companyId: requester.companyId, isPublished: true, ...(category ? { category } : {}) },
      orderBy: { hitCount: 'desc' },
    });
  }

  private async handleMessage(sessionId: string, dto: SendMessageDto, requester: AuthUser) {
    await this.assertOwnSession(sessionId, requester);
    await this.prisma.chatMessage.create({ data: { sessionId, role: 'USER', content: dto.content } });
    return this.prisma.chatMessage.create({ data: { sessionId, role: 'ASSISTANT', content: AI_NOT_WIRED_MESSAGE } });
  }

  private async assertOwnSession(sessionId: string, requester: AuthUser) {
    const session = await this.prisma.chatSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('대화 세션을 찾을 수 없습니다.');
    if (session.userId !== requester.sub) throw new ForbiddenException('본인의 대화 세션만 조회할 수 있습니다.');
  }
}
