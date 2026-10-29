import { ForbiddenException } from '@nestjs/common';
import { AiToolsService, searchTerms } from './ai-tools.service';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';

/**
 * AI 도구 계층의 권한 격리(이중 방어)와 "제안 → 확인" 패턴을 검증한다.
 * Prisma/Policy/LeaveService는 모킹하므로 DB 없이 실행된다.
 */

function authUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    sub: 'user-1',
    companyId: 'company-1',
    roleId: 'role-employee',
    roleName: 'EMPLOYEE',
    departmentId: null,
    ...overrides,
  };
}

function build(grantedReadResources: string[], hasPermission = false) {
  const prisma = {
    rolePermission: {
      findMany: jest
        .fn()
        .mockResolvedValue(grantedReadResources.map((resource) => ({ permission: { resource } }))),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: 'user-1', name: '박지훈' }),
      findFirst: jest.fn().mockResolvedValue({ id: 'other-user', name: '김철수' }),
    },
    attendance: { findMany: jest.fn().mockResolvedValue([]) },
    aiActionDraft: { create: jest.fn().mockResolvedValue({ id: 'draft-1' }) },
    productionOrder: { findFirst: jest.fn().mockResolvedValue({ id: 'po-1', orderNo: 'PO-2026-0001' }) },
    $queryRaw: jest.fn().mockResolvedValue([]),
  };
  const leaveService = { create: jest.fn() };
  const policy = { hasPermission: jest.fn().mockResolvedValue(hasPermission) };
  const rag = { search: jest.fn().mockResolvedValue(null) };
  const scheduleService = { findAll: jest.fn().mockResolvedValue([]) };
  const statisticsService = {
    getSalesCharts: jest.fn(),
    getInventoryCharts: jest.fn(),
    getHrCharts: jest.fn(),
    getMyCharts: jest.fn(),
    getDashboard: jest.fn(),
  };
  const service = new AiToolsService(
    prisma as never,
    leaveService as never,
    policy as never,
    rag as never,
    scheduleService as never,
    statisticsService as never,
  );
  return { service, prisma, leaveService, policy, rag, scheduleService, statisticsService };
}

const names = (declarations: { name?: string }[]) => declarations.map((d) => d.name);

describe('AiToolsService — 노출 단계(1차 방어)', () => {
  it('리소스 READ 권한이 없으면 해당 도구는 목록에서 제외된다', async () => {
    const { service } = build(['ANNOUNCEMENT']); // INVENTORY 권한 없음
    const declarations = await service.getDeclarations(authUser(), '재고가 부족한 품목 알려줘');
    expect(names(declarations)).not.toContain('getLowStockProducts');
    expect(names(declarations)).not.toContain('getInventoryByProduct');
  });

  it('READ 권한이 있으면 키워드와 일치하는 도구만 좁혀서 노출한다', async () => {
    const { service } = build(['INVENTORY', 'ANNOUNCEMENT']);
    const declarations = await service.getDeclarations(authUser(), '재고가 부족한 품목 알려줘');
    expect(names(declarations)).toContain('getLowStockProducts');
    expect(names(declarations)).not.toContain('getAnnouncements');
  });

  it('키워드가 매칭되지 않으면 권한 내 전체 도구를 노출하되 권한 밖 도구는 여전히 숨긴다', async () => {
    const { service } = build(['ANNOUNCEMENT']);
    const declarations = await service.getDeclarations(authUser(), '안녕하세요');
    expect(names(declarations)).toContain('getAnnouncements');
    expect(names(declarations)).not.toContain('getLowStockProducts');
  });

  it('공지 작성 초안 도구는 ANNOUNCEMENT:CREATE 권한자에게만 노출된다', async () => {
    const denied = build(['ANNOUNCEMENT'], false);
    expect(names(await denied.service.getDeclarations(authUser(), '공지 작성해줘'))).not.toContain(
      'draftAnnouncement',
    );

    const allowed = build(['ANNOUNCEMENT'], true);
    expect(names(await allowed.service.getDeclarations(authUser(), '공지 작성해줘'))).toContain(
      'draftAnnouncement',
    );
    expect(allowed.policy.hasPermission).toHaveBeenCalledWith(expect.anything(), 'ANNOUNCEMENT', 'CREATE');
  });
});

describe('AiToolsService — 도구 후보 좁히기', () => {
  it('"알려줘" 같은 흔한 말 때문에 쓰기 제안 도구가 후보로 끼어들지 않는다', async () => {
    // 공지 작성 권한이 있는 관리자도, 문서/규정 질문에는 문서 검색 도구만 후보여야 한다
    const { service } = build(['DOCUMENT', 'ANNOUNCEMENT', 'PRODUCTION'], true);
    const exposed = names(await service.getDeclarations(authUser(), '재택근무 지침 알려줘'));
    expect(exposed).toContain('searchInternalDocuments');
    expect(exposed).not.toContain('draftAnnouncement');
    expect(exposed).not.toContain('getProductionOrdersByStatus');
  });

  it('규정 키워드가 없어도 다른 도구가 매칭되면 문서 검색 도구를 함께 후보에 둔다', async () => {
    const { service } = build(['DOCUMENT', 'ANNOUNCEMENT']);
    const exposed = names(await service.getDeclarations(authUser(), '병가는 며칠까지 쓸 수 있어?'));
    expect(exposed).toContain('draftLeaveRequest');
    expect(exposed).toContain('searchInternalDocuments');
    expect(exposed).not.toContain('getAnnouncements');
  });

  it('문서 READ 권한이 없으면 문서 검색 도구를 덧붙이지 않는다', async () => {
    const { service } = build(['ANNOUNCEMENT']);
    const exposed = names(await service.getDeclarations(authUser(), '병가는 며칠까지 쓸 수 있어?'));
    expect(exposed).not.toContain('searchInternalDocuments');
  });

  it('공지를 쓰겠다고 말하면 공지 초안 도구가 후보에 오른다', async () => {
    const { service } = build(['ANNOUNCEMENT'], true);
    expect(names(await service.getDeclarations(authUser(), '전체 공지 작성해줘'))).toContain(
      'draftAnnouncement',
    );
  });
});

describe('AiToolsService — 실행 단계(2차 방어)', () => {
  it('노출되지 않았던 도구를 LLM이 직접 호출해도 권한 오류를 반환하고 쿼리를 실행하지 않는다', async () => {
    const { service, prisma } = build([]);
    const result = await service.execute('getLowStockProducts', {}, authUser(), 'session-1');
    expect(result).toEqual({ error: expect.stringContaining('권한이 없습니다') });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('존재하지 않는 도구 이름은 거부한다', async () => {
    const { service } = build([]);
    const result = await service.execute('dropAllTables', {}, authUser(), 'session-1');
    expect(result).toEqual({ error: expect.stringContaining('알 수 없는 도구') });
  });

  it('EMPLOYEE가 타인 이름을 인자로 넘겨도 항상 본인으로 강제 스코핑한다', async () => {
    const { service, prisma } = build([]);
    await service.execute('getAttendanceSummary', { employeeName: '김철수' }, authUser(), 'session-1');
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    expect(prisma.attendance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } }),
    );
  });

  it('HR_MANAGER는 이름으로 타인을 조회할 수 있고 companyId 범위 안에서만 검색한다', async () => {
    const { service, prisma } = build([]);
    const hr = authUser({ roleName: 'HR_MANAGER', roleId: 'role-hr' });
    await service.execute('getAttendanceSummary', { employeeName: '김철수' }, hr, 'session-1');
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { companyId: 'company-1', name: { contains: '김철수', mode: 'insensitive' } },
    });
    expect(prisma.attendance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'other-user' } }),
    );
  });
});

describe('AiToolsService — 제안(draft) 도구는 데이터를 직접 바꾸지 않는다', () => {
  it('연차 초안은 AiActionDraft만 만들고 LeaveService.create는 호출하지 않는다', async () => {
    const { service, prisma, leaveService } = build([]);
    const result = await service.execute(
      'draftLeaveRequest',
      { type: 'ANNUAL', startDate: '2026-10-19' },
      authUser(),
      'session-1',
    );
    expect(result).toMatchObject({ drafted: true, draftId: 'draft-1' });
    expect(prisma.aiActionDraft.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 'user-1', actionType: 'LEAVE_REQUEST' }),
    });
    expect(leaveService.create).not.toHaveBeenCalled();
  });

  it('잘못된 휴가 유형/날짜 형식/시간반차 누락은 초안 생성 전에 거부한다', async () => {
    const { service, prisma } = build([]);
    const user = authUser();
    expect(
      await service.execute('draftLeaveRequest', { type: 'WHATEVER', startDate: '2026-10-19' }, user, 's'),
    ).toHaveProperty('error');
    expect(
      await service.execute('draftLeaveRequest', { type: 'ANNUAL', startDate: '내일' }, user, 's'),
    ).toHaveProperty('error');
    expect(
      await service.execute('draftLeaveRequest', { type: 'HOURLY', startDate: '2026-10-19' }, user, 's'),
    ).toHaveProperty('error');
    expect(prisma.aiActionDraft.create).not.toHaveBeenCalled();
  });

  it('생산 오더 상태 변경 초안은 비ADMIN이면 담당자 본인 오더로만 조회한다', async () => {
    const { service, prisma } = build([], true);
    const args = { orderNo: 'PO-2026-0001', status: 'COMPLETED' };

    await service.execute('draftProductionStatusUpdate', args, authUser({ roleName: 'SALES_MANAGER' }), 's');
    expect(prisma.productionOrder.findFirst).toHaveBeenLastCalledWith({
      where: { companyId: 'company-1', orderNo: 'PO-2026-0001', managerId: 'user-1' },
    });

    await service.execute('draftProductionStatusUpdate', args, authUser({ roleName: 'ADMIN' }), 's');
    expect(prisma.productionOrder.findFirst).toHaveBeenLastCalledWith({
      where: { companyId: 'company-1', orderNo: 'PO-2026-0001' },
    });
  });
});

describe('문서 검색', () => {
  it('검색어를 단어로 나누고 한 글자/중복은 버린다', () => {
    expect(searchTerms('재택근무 지침')).toEqual(['재택근무', '지침']);
    expect(searchTerms('연차, 규정 연차 a')).toEqual(['연차', '규정']);
    expect(searchTerms('   ')).toEqual([]);
  });

  it('여러 단어 질문도 단어 하나라도 겹치면 후보로 찾고, 더 많이 겹치는 문서를 앞에 둔다', async () => {
    const { service, prisma } = build(['DOCUMENT']);
    (prisma as unknown as { document: { findMany: jest.Mock } }).document = {
      findMany: jest.fn().mockResolvedValue([
        { title: '2026년 취업규칙', summary: '지침 일부 언급', category: '인사' },
        { title: '재택근무 운영 지침', summary: '재택근무는 주 2회까지', category: '인사' },
      ]),
    };
    const result = (await service.execute(
      'searchInternalDocuments',
      { query: '재택근무 지침' },
      authUser(),
      's',
    )) as {
      found: boolean;
      items: { title: string }[];
    };
    expect(result.found).toBe(true);
    expect(result.items[0].title).toBe('재택근무 운영 지침');

    const where = (prisma as unknown as { document: { findMany: jest.Mock } }).document.findMany.mock
      .calls[0][0] as { where: { companyId: string; indexStatus: string } };
    // 회사 스코프와 색인 완료 문서만 검색한다
    expect(where.where).toMatchObject({ companyId: 'company-1', indexStatus: 'DONE' });
  });
});

describe('AiToolsService — 일정/통계/FAQ 도구', () => {
  it('일정 도구는 SCHEDULE READ 권한이 있을 때만 노출된다', async () => {
    const denied = build(['ANNOUNCEMENT']);
    expect(names(await denied.service.getDeclarations(authUser(), '이번 주 일정 알려줘'))).not.toContain('getSchedules');

    const allowed = build(['SCHEDULE']);
    expect(names(await allowed.service.getDeclarations(authUser(), '이번 주 일정 알려줘'))).toContain('getSchedules');
  });

  it('일정은 ScheduleService.findAll(요청자 기준)을 KST 기간으로 호출하고, 날짜 하나만 주면 그날만 본다', async () => {
    const { service, scheduleService } = build(['SCHEDULE']);
    scheduleService.findAll.mockResolvedValue([
      {
        title: '주간 회의',
        type: 'MEETING',
        startAt: new Date('2026-11-02T00:00:00Z'),
        endAt: new Date('2026-11-02T01:00:00Z'),
        allDay: false,
        location: '3층',
      },
    ]);
    const requester = authUser();
    const result = (await service.execute('getSchedules', { startDate: '2026-11-02' }, requester, 's')) as {
      found: boolean;
      items: { title: string; start: string }[];
    };

    expect(scheduleService.findAll).toHaveBeenCalledWith(
      { from: '2026-11-02T00:00:00+09:00', to: '2026-11-02T23:59:59+09:00' },
      requester,
    );
    expect(result.items[0]).toMatchObject({ title: '주간 회의', start: '2026-11-02 09:00' });
  });

  it('일정이 없으면 없다고 돌려준다', async () => {
    const { service } = build(['SCHEDULE']);
    const result = (await service.execute('getSchedules', {}, authUser(), 's')) as { found: boolean };
    expect(result.found).toBe(false);
  });

  it('통계는 주제별 서비스 메서드를 호출하고 역할 제한(Forbidden)은 권한 오류로 돌려준다', async () => {
    const { service, statisticsService } = build(['STATISTICS']);
    statisticsService.getHrCharts.mockRejectedValue(
      new ForbiddenException('인사 통계는 관리자/인사 담당자만 조회할 수 있습니다.'),
    );
    const denied = (await service.execute('getStatistics', { topic: 'hr' }, authUser(), 's')) as { error: string };
    expect(denied.error).toContain('인사 담당자만');

    statisticsService.getSalesCharts.mockResolvedValue({ monthlyTrend: [{ label: '10월', value: 100 }], byPartner: [] });
    const ok = (await service.execute('getStatistics', { topic: 'sales' }, authUser(), 's')) as {
      topic: string;
      monthlyTrend: unknown[];
    };
    expect(ok.topic).toBe('sales');
    expect(ok.monthlyTrend).toHaveLength(1);
  });

  it('통계 topic이 올바르지 않으면 오류를 돌려준다', async () => {
    const { service } = build(['STATISTICS']);
    const result = (await service.execute('getStatistics', { topic: 'weather' }, authUser(), 's')) as {
      error: string;
    };
    expect(result.error).toContain('topic');
  });

  it('FAQ는 키워드로 고르고, 일치가 없으면 인기 FAQ를 matchedByKeyword=false로 준다', async () => {
    const { service, prisma } = build([]);
    (prisma as unknown as { faqItem: { findMany: jest.Mock } }).faqItem = {
      findMany: jest.fn().mockResolvedValue([
        { question: '반차는 연차에서 차감되나요?', answer: '네 0.5일 차감됩니다.', category: '휴가' },
        { question: '비밀번호를 잊었어요', answer: '로그인 화면에서 재설정하세요.', category: '계정' },
      ]),
    };

    const hit = (await service.execute('searchFaq', { query: '비밀번호' }, authUser(), 's')) as {
      matchedByKeyword: boolean;
      items: { question: string }[];
    };
    expect(hit.matchedByKeyword).toBe(true);
    expect(hit.items).toHaveLength(1);
    expect(hit.items[0].question).toBe('비밀번호를 잊었어요');

    const miss = (await service.execute('searchFaq', { query: '주차장' }, authUser(), 's')) as {
      matchedByKeyword: boolean;
      items: unknown[];
    };
    expect(miss.matchedByKeyword).toBe(false);
    expect(miss.items).toHaveLength(2);
  });
});
