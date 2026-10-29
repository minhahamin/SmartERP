import type { DocumentCategory } from '@prisma/client';

/** 키워드가 제목에 있으면 본문보다 가중치를 크게 준다 — 제목은 작성자가 문서의 성격을 직접 쓴 것이기 때문이다 */
const TITLE_WEIGHT = 5;
const BODY_SAMPLE_CHARS = 3000;
const MIN_SCORE = 2;

const KEYWORDS: Record<Exclude<DocumentCategory, 'ETC'>, string[]> = {
  CONTRACT: ['계약서', '계약', '납품', '대금', '위약', '해지'],
  POLICY: ['규정', '지침', '정책', '방침', '수칙', '취업규칙', '보안'],
  MANUAL: ['매뉴얼', '가이드', '사용법', '절차', '안내서', '운영 방법'],
  REPORT: ['보고서', '실적', '분석', '결과', '현황', '회의록'],
  HR: ['인사', '채용', '급여', '복리후생', '근태', '휴가', '연차'],
};

export interface Classification {
  category: DocumentCategory;
  score: number;
}

/**
 * 제목과 본문 앞부분의 키워드로 문서 분류를 추정한다. AI를 부르지 않는 규칙 기반이라 무료 한도와 무관하고
 * 결과가 항상 같다. 근거가 약하면(점수 부족) 판단하지 않고 기타(ETC)로 둔다.
 */
export function classifyDocument(title: string, text: string): Classification {
  const body = text.slice(0, BODY_SAMPLE_CHARS);
  let best: Classification = { category: 'ETC', score: 0 };

  for (const [category, words] of Object.entries(KEYWORDS) as [Exclude<DocumentCategory, 'ETC'>, string[]][]) {
    let score = 0;
    for (const word of words) {
      if (title.includes(word)) score += TITLE_WEIGHT;
      if (word.length >= 2 && body.includes(word)) score += 1;
    }
    if (score > best.score) best = { category, score };
  }
  return best.score >= MIN_SCORE ? best : { category: 'ETC', score: best.score };
}
