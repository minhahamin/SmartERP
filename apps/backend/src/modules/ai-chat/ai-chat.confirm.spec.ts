import { ForbiddenException } from '@nestjs/common';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { AiChatService } from './ai-chat.service';

const employee: AuthUser = {
  sub: 'user-1',
  companyId: 'company-1',
  roleId: 'role-employee',
  roleName: 'EMPLOYEE',
  departmentId: null,
};

function build(actionType: string, payload: Record<string, unknown>, granted: boolean) {
  const draft = {
    id: 'draft-1',
    userId: 'user-1',
    actionType,
    payload,
    status: 'PENDING',
    createdAt: new Date(),
  };
  const prisma = {
    aiActionDraft: {
      findUnique: jest.fn().mockResolvedValue(draft),
      update: jest.fn().mockResolvedValue({ ...draft, status: 'CONFIRMED' }),
    },
  };
  const leaveService = { create: jest.fn().mockResolvedValue({ id: 'leave-1' }) };
  const announcementsService = { create: jest.fn().mockResolvedValue({ id: 'ann-1' }) };
  const productionService = { updateStatus: jest.fn().mockResolvedValue({ id: 'po-1' }) };
  const policy = {
    assertAccess: jest.fn(() =>
      granted ? Promise.resolve() : Promise.reject(new ForbiddenException('권한이 없습니다.')),
    ),
  };
  const config = { get: jest.fn() };
  const service = new AiChatService(
    prisma as never,
    {} as never,
    leaveService as never,
    announcementsService as never,
    productionService as never,
    policy as never,
    config as never,
  );
  return { service, prisma, leaveService, announcementsService, productionService, policy };
}

describe('AiChatService.confirmAction — 확정 시점에 권한을 다시 검사한다', () => {
  it('공지 작성 권한이 없으면(초안 생성 뒤 회수된 경우 포함) 공지를 만들지 않고 초안도 PENDING으로 남긴다', async () => {
    const { service, announcementsService, prisma, policy } = build(
      'ANNOUNCEMENT',
      { title: '제목', content: '내용' },
      false,
    );
    await expect(service.confirmAction('draft-1', employee)).rejects.toBeInstanceOf(ForbiddenException);
    expect(policy.assertAccess).toHaveBeenCalledWith(employee, 'ANNOUNCEMENT', 'CREATE');
    expect(announcementsService.create).not.toHaveBeenCalled();
    expect(prisma.aiActionDraft.update).not.toHaveBeenCalled();
  });

  it('생산 상태 변경은 PRODUCTION:UPDATE 권한이 없으면 거부한다', async () => {
    const { service, productionService, policy } = build(
      'PRODUCTION_STATUS_UPDATE',
      { productionOrderId: 'po-1', status: 'COMPLETED' },
      false,
    );
    await expect(service.confirmAction('draft-1', employee)).rejects.toBeInstanceOf(ForbiddenException);
    expect(policy.assertAccess).toHaveBeenCalledWith(employee, 'PRODUCTION', 'UPDATE');
    expect(productionService.updateStatus).not.toHaveBeenCalled();
  });

  it('권한이 있으면 도메인 서비스를 호출해 확정한다', async () => {
    const { service, announcementsService } = build('ANNOUNCEMENT', { title: '제목', content: '내용' }, true);
    await service.confirmAction('draft-1', employee);
    expect(announcementsService.create).toHaveBeenCalledTimes(1);
  });

  it('연차 신청은 본인 self-service라 별도 리소스 권한을 요구하지 않는다', async () => {
    const { service, leaveService, policy } = build(
      'LEAVE_REQUEST',
      { type: 'ANNUAL', startDate: '2026-10-20', endDate: '2026-10-20' },
      false,
    );
    await service.confirmAction('draft-1', employee);
    expect(policy.assertAccess).not.toHaveBeenCalled();
    expect(leaveService.create).toHaveBeenCalledTimes(1);
  });
});
