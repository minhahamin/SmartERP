import { buildSystemPrompt } from './ai-chat.service';

describe('buildSystemPrompt', () => {
  it('KST 기준 오늘 날짜와 요일을 넣어 상대 날짜를 해석할 수 있게 한다', () => {
    // 2026-10-15T20:00Z == 2026-10-16(금) 05:00 KST — UTC 날짜와 하루 차이나는 경계 케이스
    const prompt = buildSystemPrompt(new Date('2026-10-15T20:00:00Z'));
    expect(prompt).toContain('오늘은 2026-10-16 (금요일)');
    expect(prompt).toContain('KST');
  });
});
