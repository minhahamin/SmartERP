import { isTransientError, retryTransient } from './retry-transient';

const apiError = (status: number) => Object.assign(new Error(`status ${status}`), { status });
const noSleep = () => Promise.resolve();

describe('retryTransient', () => {
  it('일시적 오류(503)는 재시도해서 성공하면 결과를 돌려준다', async () => {
    const fn = jest.fn().mockRejectedValueOnce(apiError(503)).mockResolvedValue('ok');
    await expect(retryTransient(fn, { sleep: noSleep })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('지수 백오프로 대기한다(1초 → 2초)', async () => {
    const sleep = jest.fn().mockResolvedValue(undefined);
    const fn = jest
      .fn()
      .mockRejectedValueOnce(apiError(503))
      .mockRejectedValueOnce(apiError(429))
      .mockResolvedValue('ok');
    await retryTransient(fn, { sleep, baseDelayMs: 1000 });
    expect(sleep).toHaveBeenNthCalledWith(1, 1000);
    expect(sleep).toHaveBeenNthCalledWith(2, 2000);
  });

  it('재시도 한도를 넘으면 마지막 오류를 던진다', async () => {
    const fn = jest.fn().mockRejectedValue(apiError(503));
    await expect(retryTransient(fn, { retries: 2, sleep: noSleep })).rejects.toThrow('status 503');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('재시도해도 소용없는 오류(400/401/403)는 즉시 던진다', async () => {
    for (const status of [400, 401, 403]) {
      const fn = jest.fn().mockRejectedValue(apiError(status));
      await expect(retryTransient(fn, { sleep: noSleep })).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(1);
    }
  });

  it('status 필드가 없어도 메시지의 JSON code로 일시 오류를 판별한다', () => {
    const error = new Error(
      'ApiError: {"error":{"code":503,"message":"high demand","status":"UNAVAILABLE"}}',
    );
    expect(isTransientError(error)).toBe(true);
    expect(isTransientError(new Error('plain failure'))).toBe(false);
  });
});
