import { chunkText } from './chunker';

describe('chunkText', () => {
  it('짧은 문단들은 한 조각으로 합친다', () => {
    expect(chunkText('첫 문단\n\n둘째 문단')).toEqual(['첫 문단 둘째 문단']);
  });

  it('maxChars를 넘으면 문단 경계에서 나눈다', () => {
    const chunks = chunkText(`${'가'.repeat(500)}\n\n${'나'.repeat(500)}`);
    expect(chunks).toEqual(['가'.repeat(500), '나'.repeat(500)]);
  });

  it('한 문단이 너무 길면 overlap을 두고 자른다', () => {
    const chunks = chunkText('가'.repeat(1000), 400, 50);
    expect(chunks.map((c) => c.length)).toEqual([400, 400, 300]);
    expect(chunks.join('').length).toBe(1100);
  });

  it('빈 본문은 조각이 없다', () => {
    expect(chunkText('  \n\n ')).toEqual([]);
  });
});
