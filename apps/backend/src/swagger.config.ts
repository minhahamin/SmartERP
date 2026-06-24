import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/** main.ts와 scripts/generate-openapi.ts가 동일한 설정을 공유하도록 분리 (docs/08.6) */
export function buildSwaggerDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('ERPilot API')
    .setDescription(
      'AI 기반 ERP SaaS 플랫폼 API 문서. RBAC/JWT 설계는 docs/02·12, 스키마는 docs/07, ' +
        '엔드포인트 설계 원칙(공통 응답 envelope, 페이지네이션, 에러 코드)은 docs/08을 따른다.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', '로그인/토큰 재발급/로그아웃 (docs/12)')
    .addTag('Users', '직원 관리 (docs/08 8.4.2)')
    .addTag('Departments', '부서 관리')
    .addTag('Roles', '권한 관리 — 역할/Permission 매핑 토글 (docs/02 2.3)')
    .addTag('Attendance', '근태 관리(출퇴근 체크 포함)')
    .addTag('Leave', '휴가 신청/승인, 연차 잔여 현황')
    .addTag('Payroll', '급여 산정/확정/지급 (docs/08 8.4.3)')
    .addTag('Schedule', '일정 관리(본인/부서/전사 공개범위)')
    .addTag('Partners', '거래처 관리')
    .addTag('Products', '제품 관리')
    .addTag('Inventory', '재고 현황/실사, 창고 관리 (docs/08 8.4.4)')
    .addTag('Stock Movements', '입출고 이력/등록 (Append-only 원장, docs/07 7.6 #4)')
    .addTag('Production', '생산 오더(완료 시 입고 자동 생성)')
    .addTag('Documents', '문서 업로드/버전 관리 (docs/08 8.4.5)')
    .addTag('Announcements', '공지사항')
    .addTag('Statistics', '역할별 대시보드 통계')
    .addTag('AI Chat', 'AI 챗봇 세션/메시지 (docs/08 8.4.6, 실제 Function Calling은 docs/09~11 범위)')
    .addTag('Health', '헬스체크 (docs/14.6)')
    .build();

  return SwaggerModule.createDocument(app, config);
}
