import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
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

  @Get('faq')
  @ApiOperation({ summary: '게시된 FAQ 목록' })
  listFaq(@Query('category') category: string | undefined, @CurrentUser() user: AuthUser) {
    return this.aiChatService.listFaq(category, user);
  }
}
