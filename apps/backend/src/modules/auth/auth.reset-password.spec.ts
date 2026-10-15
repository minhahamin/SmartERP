import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthTokenService } from './auth-token.service';

/** 실제 JwtService로 서명/검증해서 재설정 링크가 "한 번만" 쓸 수 있는지 확인한다 */
function build() {
  const secret = 'test-secret-test-secret-test-secret-1234';
  const config = { get: jest.fn((key: string) => (key === 'JWT_ACCESS_SECRET' ? secret : undefined)) };
  const tokenService = new AuthTokenService(new JwtService({}), config as never);

  const state = { passwordHash: 'old-hash' };
  const prisma = {
    user: {
      findUnique: jest.fn(() => Promise.resolve({ id: 'u1', passwordHash: state.passwordHash })),
      update: jest.fn(({ data }: { data: { passwordHash?: string } }) => {
        if (data.passwordHash) state.passwordHash = data.passwordHash;
        return Promise.resolve({});
      }),
    },
  };
  const service = new AuthService(prisma as never, tokenService, {} as never, config as never);
  return { service, tokenService, prisma, state };
}

describe('AuthService.resetPassword', () => {
  it('유효한 링크로는 비밀번호가 바뀌고 세션이 무효화된다', async () => {
    const { service, tokenService, prisma, state } = build();
    const token = tokenService.signPasswordResetToken('u1', state.passwordHash);

    await service.resetPassword(token, 'new-password-1');

    expect(state.passwordHash).not.toBe('old-hash');
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ omit: { passwordHash: false } }),
    );
    expect(prisma.user.update).toHaveBeenCalledTimes(2); // 비밀번호 변경 + 세션 무효화
  });

  it('한 번 사용한 링크는 15분 안이라도 다시 쓸 수 없다', async () => {
    const { service, tokenService, state } = build();
    const token = tokenService.signPasswordResetToken('u1', state.passwordHash);

    await service.resetPassword(token, 'new-password-1');
    const changedHash = state.passwordHash;

    await expect(service.resetPassword(token, 'attacker-password')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(state.passwordHash).toBe(changedHash);
  });

  it('위조/다른 용도의 토큰은 거부한다', async () => {
    const { service } = build();
    await expect(service.resetPassword('not-a-jwt', 'new-password-1')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    const other = new JwtService({}).sign(
      { sub: 'u1', purpose: 'access' },
      { secret: 'test-secret-test-secret-test-secret-1234' },
    );
    await expect(service.resetPassword(other, 'new-password-1')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
