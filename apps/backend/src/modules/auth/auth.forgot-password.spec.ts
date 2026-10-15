import { AuthService } from './auth.service';

function build(
  user: { id: string; name: string; email: string; passwordHash: string } | null,
  mailFails = false,
) {
  const prisma = { user: { findFirst: jest.fn().mockResolvedValue(user) } };
  const tokenService = { signPasswordResetToken: jest.fn().mockReturnValue('signed.reset.token') };
  const mail = {
    send: mailFails
      ? jest.fn().mockRejectedValue(new Error('smtp down'))
      : jest.fn().mockResolvedValue(undefined),
  };
  const config = {
    get: jest.fn((key: string) =>
      key === 'CORS_ORIGIN' ? 'http://localhost:5173, https://erpilot.example' : undefined,
    ),
  };
  const service = new AuthService(prisma as never, tokenService as never, mail as never, config as never);
  return { service, prisma, tokenService, mail };
}

describe('AuthService.forgotPassword', () => {
  it('존재하지 않는 이메일이어도 성공만 반환하고 토큰 발급/메일 발송은 하지 않는다(계정 열거 방지)', async () => {
    const { service, mail, tokenService } = build(null);
    await expect(service.forgotPassword('nobody@erpilot.io')).resolves.toEqual({ success: true });
    expect(tokenService.signPasswordResetToken).not.toHaveBeenCalled();
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('활성 계정이면 재설정 링크를 이메일로만 전달하고 응답에는 토큰을 싣지 않는다', async () => {
    const { service, mail, prisma } = build({
      id: 'u1',
      name: '박지훈',
      email: 'jihoon@erpilot.io',
      passwordHash: 'hash-1',
    });
    const result = await service.forgotPassword('jihoon@erpilot.io');

    expect(result).toEqual({ success: true });
    expect(JSON.stringify(result)).not.toContain('signed.reset.token');
    // passwordHash는 전역 omit 대상이므로 명시적으로 요청하지 않으면 undefined가 되어 토큰 서명이 깨진다
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ omit: { passwordHash: false } }),
    );
    expect(mail.send).toHaveBeenCalledWith(
      'jihoon@erpilot.io',
      expect.stringContaining('비밀번호 재설정'),
      expect.stringContaining('http://localhost:5173/reset-password?token=signed.reset.token'),
    );
  });

  it('메일 발송이 실패해도 존재하는 계정과 같은 응답을 반환한다', async () => {
    const { service } = build(
      { id: 'u1', name: '박지훈', email: 'jihoon@erpilot.io', passwordHash: 'hash-1' },
      true,
    );
    await expect(service.forgotPassword('jihoon@erpilot.io')).resolves.toEqual({ success: true });
  });
});
