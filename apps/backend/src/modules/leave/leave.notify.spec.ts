import { LeaveService } from './leave.service';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';

const employee: AuthUser = { sub: 'emp-1', companyId: 'c1', roleId: 'r', roleName: 'EMPLOYEE', departmentId: null };
const approver: AuthUser = { sub: 'hr-1', companyId: 'c1', roleId: 'r2', roleName: 'HR_MANAGER', departmentId: null };

const dto = { type: 'ANNUAL', startDate: '2026-11-02', endDate: '2026-11-03' } as never;

function build() {
  const prisma = {
    $transaction: jest.fn(),
    leaveRequest: { findUnique: jest.fn(), update: jest.fn() },
  };
  const policy = { assertAccess: jest.fn().mockResolvedValue(undefined), hasPermission: jest.fn() };
  const notifier = {
    notifyByPermission: jest.fn().mockResolvedValue(1),
    notifyUsers: jest.fn().mockResolvedValue(1),
  };
  const service = new LeaveService(prisma as never, policy as never, notifier as never);
  return { service, prisma, notifier };
}

describe('LeaveService 결재 알림', () => {
  it('대기 상태로 접수되면 결재 권한자에게 알리되 신청자 본인은 제외한다', async () => {
    const { service, notifier } = build();
    jest.spyOn(service as never, 'createRequest').mockResolvedValue({ id: 'lv-1', status: 'PENDING', type: 'ANNUAL' } as never);

    await service.create(dto, employee);

    expect(notifier.notifyByPermission).toHaveBeenCalledWith(
      'c1',
      { resource: 'LEAVE', action: 'APPROVE' },
      expect.objectContaining({ type: 'LEAVE_REQUESTED', dedupeKey: 'leave-requested:lv-1' }),
      'emp-1',
    );
  });

  it('결재 권한자가 올려 즉시 승인된 신청은 알림을 보내지 않는다', async () => {
    const { service, notifier } = build();
    jest.spyOn(service as never, 'createRequest').mockResolvedValue({ id: 'lv-2', status: 'APPROVED', type: 'ANNUAL' } as never);
    await service.create(dto, approver);
    expect(notifier.notifyByPermission).not.toHaveBeenCalled();
  });

  it('알림이 실패해도 휴가 신청 자체는 성공한다', async () => {
    const { service, notifier } = build();
    notifier.notifyByPermission.mockRejectedValue(new Error('db down'));
    jest.spyOn(service as never, 'createRequest').mockResolvedValue({ id: 'lv-3', status: 'PENDING', type: 'ANNUAL' } as never);
    await expect(service.create(dto, employee)).resolves.toMatchObject({ id: 'lv-3' });
  });

  it('반려하면 신청자에게 결과를 알린다', async () => {
    const { service, prisma, notifier } = build();
    const request = { id: 'lv-4', userId: 'emp-1', type: 'ANNUAL', startDate: new Date('2026-11-02T00:00:00Z'), status: 'PENDING', user: { companyId: 'c1' } };
    prisma.leaveRequest.findUnique.mockResolvedValue(request);
    prisma.leaveRequest.update.mockResolvedValue({ ...request, status: 'REJECTED' });

    await service.reject('lv-4', approver);

    expect(notifier.notifyUsers).toHaveBeenCalledWith(
      ['emp-1'],
      expect.objectContaining({ type: 'LEAVE_REJECTED', dedupeKey: 'leave-decision:lv-4' }),
    );
  });

  it('본인이 처리한 결과는 본인에게 알리지 않는다', async () => {
    const { service, prisma, notifier } = build();
    const request = { id: 'lv-5', userId: 'hr-1', type: 'ANNUAL', startDate: new Date('2026-11-02T00:00:00Z'), status: 'PENDING', user: { companyId: 'c1' } };
    prisma.leaveRequest.findUnique.mockResolvedValue(request);
    prisma.leaveRequest.update.mockResolvedValue({ ...request, status: 'REJECTED' });
    await service.reject('lv-5', approver);
    expect(notifier.notifyUsers).not.toHaveBeenCalled();
  });
});
