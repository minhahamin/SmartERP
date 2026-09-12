import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Audit } from '../../common/decorators/audit-log.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { AiChatService } from './ai-chat.service';
import { SendMessageDto } from './dto/send-message.dto';

/**
 * docs/08-api-design.md 8.4.6 — AI 챗봇. `@RequirePermissions`를 적용하지 않고 인증만 요구한다.
 * RBAC은 메시지 처리 파이프라인 내부(AiToolsService의 RolePermission 조회 + 실행 단계 스코핑)에서 적용된다.
 * 실제 Gemini 호출은 도구 호출 루프가 끝나야 완성되므로, 원래 설계된 SSE 스트리밍 대신 완료된 답변을
 * 한 번에 반환하는 일반 POST로 단순화했다(토큰 단위 스트리밍은 향후 과제).
 */
@ApiTags('AI Chat')
@ApiBearerAuth()
@Controller('ai')
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  @Get('sessions')
  @ApiOperation({ summary: '내 대화 세션 목록' })
  listSessions(@CurrentUser() user: AuthUser) {
    return this.aiChatService.listSessions(user.sub);
  }

  @Post('sessions')
  @ApiOperation({ summary: '새 세션 생성' })
  createSession(@Body('title') title: string | undefined, @CurrentUser() user: AuthUser) {
    return this.aiChatService.createSession(user.sub, title);
  }

  @Delete('sessions/:id')
  @ApiOperation({ summary: '대화 세션 삭제(본인 세션만)' })
  deleteSession(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.aiChatService.deleteSession(id, user);
  }

  @Get('sessions/:id/messages')
  @ApiOperation({ summary: '세션 메시지 이력(본인 세션만)' })
  listMessages(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.aiChatService.listMessages(id, user);
  }

  @Post('sessions/:id/messages')
  @ApiOperation({ summary: '질의 전송 → AI 응답(Function Calling)' })
  sendMessage(@Param('id') id: string, @Body() dto: SendMessageDto, @CurrentUser() user: AuthUser) {
    return this.aiChatService.sendMessage(id, dto, user);
  }

  @Post('actions/:id/confirm')
  @Audit('AI_ACTION_CONFIRM', 'AI_ACTION')
  @ApiOperation({ summary: 'AI가 제안한 액션 초안을 확정 실행(본인 제안만)' })
  confirmAction(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.aiChatService.confirmAction(id, user);
  }

  @Post('actions/:id/reject')
  @ApiOperation({ summary: 'AI가 제안한 액션 초안을 반려(본인 제안만)' })
  rejectAction(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.aiChatService.rejectAction(id, user);
  }

  @Get('faq')
  @ApiOperation({ summary: '게시된 FAQ 목록' })
  listFaq(@Query('category') category: string | undefined, @CurrentUser() user: AuthUser) {
    return this.aiChatService.listFaq(category, user);
  }

  @Post('faq')
  @RequirePermissions('DOCUMENT', 'CREATE')
  @Audit('FAQ_CREATE', 'FAQ')
  @ApiOperation({ summary: 'FAQ 초안 생성 (Human-in-the-loop 검수 대기)' })
  createFaq(
    @Body() dto: { question: string; answer: string; category?: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.aiChatService.createFaqDraft(dto, user);
  }

  @Post('faq/:id/publish')
  @RequirePermissions('DOCUMENT', 'UPDATE')
  @Audit('FAQ_PUBLISH', 'FAQ')
  @ApiOperation({ summary: 'FAQ 검수 후 게시' })
  publishFaq(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.aiChatService.publishFaq(id, user);
  }

  @Post('faq/:id/reject')
  @RequirePermissions('DOCUMENT', 'UPDATE')
  @Audit('FAQ_REJECT', 'FAQ')
  @ApiOperation({ summary: 'FAQ 반려 (초안 삭제)' })
  rejectFaq(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.aiChatService.rejectFaq(id, user);
  }
}
