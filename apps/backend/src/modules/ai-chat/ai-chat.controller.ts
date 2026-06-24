import { Body, Controller, Get, Param, Post, Query, Sse } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Observable } from 'rxjs';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SkipResponseEnvelope } from '../../common/decorators/skip-response-envelope.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { AiChatService } from './ai-chat.service';
import { SendMessageDto } from './dto/send-message.dto';

/**
 * docs/08-api-design.md 8.4.6 — AI 챗봇. `@RequirePermissions`를 적용하지 않고 인증만 요구한다.
 * RBAC은 메시지 처리 파이프라인 내부(Function Calling 인자 강제 주입, docs/09 4장)에서 적용되며
 * 그 파이프라인 자체는 이번 작업 범위(docs/02·07·08·12·13·14) 밖이라 아직 연동되지 않았다.
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

  @Get('sessions/:id/messages')
  @ApiOperation({ summary: '세션 메시지 이력(본인 세션만)' })
  listMessages(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.aiChatService.listMessages(id, user);
  }

  @Post('sessions/:id/messages')
  @Sse()
  @SkipResponseEnvelope()
  @ApiOperation({ summary: '질의 전송 → SSE 스트리밍 응답' })
  sendMessage(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: AuthUser,
  ): Observable<{ data: string }> {
    return this.aiChatService.streamReply(id, dto, user);
  }

  @Get('faq')
  @ApiOperation({ summary: '게시된 FAQ 목록' })
  listFaq(@Query('category') category: string | undefined, @CurrentUser() user: AuthUser) {
    return this.aiChatService.listFaq(category, user);
  }
}
