import { aiFailureMessage, buildSystemPrompt } from './ai-chat.service';

describe('buildSystemPrompt', () => {
  it('KST 기준 오늘 날짜와 요일을 넣어 상대 날짜를 해석할 수 있게 한다', () => {
    // 2026-10-15T20:00Z == 2026-10-16(금) 05:00 KST — UTC 날짜와 하루 차이나는 경계 케이스
    const prompt = buildSystemPrompt(new Date('2026-10-15T20:00:00Z'));
    expect(prompt).toContain('오늘은 2026-10-16 (금요일)');
    expect(prompt).toContain('KST');
  });
});

describe('aiFailureMessage', () => {
  it('한도 초과/일시 혼잡은 원인과 대처를 구분해 안내하고 그 외는 일반 문구를 쓴다', () => {
    const quota = new Error('ApiError: {"error":{"code":429,"message":"You exceeded your current quota"}}');
    expect(aiFailureMessage(quota)).toContain('한도를 초과');
    const daily = new Error(
      'ApiError: {"error":{"code":429,"message":"quotaId: GenerateRequestsPerDayPerProjectPerModel-FreeTier"}}',
    );
    expect(aiFailureMessage(daily)).toContain('오늘 AI 사용 한도');
    expect(aiFailureMessage(Object.assign(new Error('busy'), { status: 503 }))).toContain('일시적으로 혼잡');
    expect(aiFailureMessage(new Error('boom'))).toContain('오류가 발생했습니다');
  });
});
