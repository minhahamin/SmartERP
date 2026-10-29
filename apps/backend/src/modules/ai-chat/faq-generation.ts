/**
 * FAQ 후보 생성의 프롬프트와 응답 해석. 서비스에서 분리해 DB·AI 없이 테스트한다.
 *
 * 후보 생성은 두 단계다. 1) 반복 질문을 묶어 대표 질문만 뽑고(답변은 쓰지 않는다), 2) 대표 질문마다 공개 문서의
 * 관련 본문(RAG)과 화면 안내를 근거로 답변을 쓴다. 근거가 없으면 지어내지 않고 답변을 비워 후보에서 제외한다 —
 * 예전에는 한 번의 호출로 질문과 답변을 함께 만들어, 근거 없는 "담당자에게 문의하세요" 류의 답이 쌓였다.
 */

/** 한 번에 답변을 쓸 후보 수의 상한(임베딩·프롬프트 크기 가드) */
export const FAQ_MAX_CANDIDATES = 10;

/** 질문당 근거로 넘기는 문서 수 */
export const FAQ_EVIDENCE_DOCUMENTS = 2;

/**
 * 답변에 근거로 쓸 수 있는 화면 안내. 실제 메뉴 이름과 기능만 적는다 — 여기에 없는 기능을 답변에 넣지 못하게 하려는
 * 것이므로, 화면이 바뀌면 이 목록도 함께 고친다.
 */
export const SCREEN_GUIDE = [
  'AI 어시스턴트: 재고·매출·근태·연차·일정·통계·FAQ·문서를 자연어로 물어볼 수 있고, 연차 신청·공지 작성 같은 작업은 초안을 만든 뒤 사용자가 확인해야 접수된다.',
  '재고 관리: 창고별 재고와 안전재고 미달 품목을 확인한다.',
  '발주 관리: 안전재고 미달 품목의 발주 초안을 확인하고 공급처·수량을 고쳐 확정·입고 처리한다(관리자).',
  '생산 관리: 생산 오더의 상태와 납기 지연을 확인한다.',
  '직원 관리 / 급여 관리 / 일정 관리 / 부서 관리: 권한이 있는 사용자가 직원, 급여, 일정, 부서 정보를 본다.',
  '거래처 관리 / 영업 관리 / 제품 관리 / 입출고 관리: 거래처, 수주, 제품, 입출고 이력을 관리한다.',
  '문서 관리: 사내 문서를 올리고 검색한다. 공지사항: 공지를 확인한다. 통계 분석: 매출·재고·인사 차트를 본다.',
];

export interface FaqCluster {
  representativeQuestion: string;
  category: string;
  matchedCount: number;
}

export interface FaqEvidenceDocument {
  title: string;
  summary: string | null;
  passages: string[];
}

export interface FaqAnswerRequest {
  id: string;
  question: string;
  documents: FaqEvidenceDocument[];
}

export function buildClusterPrompt(
  questions: { sample: string; count: number }[],
  threshold: number,
): string {
  return [
    '아래는 사내 ERP 챗봇에 실제로 들어온 사용자 질문과, 완전히 동일한 문장이 반복된 횟수입니다.',
    '표현은 다르지만 실질적으로 같은 의도를 묻는 질문들을 하나의 그룹으로 묶고,',
    `그룹에 속한 질문들의 횟수 합이 ${threshold} 이상인 그룹만 골라주세요.`,
    '각 그룹마다 대표 질문 하나(representativeQuestion), 분류(category, 예: 인사/휴가/급여/재고/영업/생산/기타), 그룹의 총 횟수 합(matchedCount)을 만들어주세요.',
    '답변은 쓰지 않습니다.',
    `기준(${threshold}회 이상)을 만족하는 그룹이 없으면 빈 배열을 반환하세요.`,
    '정확히 이 JSON 스키마의 배열로만 응답하세요: [{ "representativeQuestion": string, "category": string, "matchedCount": number }]',
    '',
    '질문 목록(질문 | 횟수):',
    ...questions.map((q) => `- ${q.sample} | ${q.count}`),
  ].join('\n');
}

export function buildAnswerPrompt(requests: FaqAnswerRequest[]): string {
  const blocks = requests.map((r) =>
    [
      `[${r.id}] 질문: ${r.question}`,
      ...(r.documents.length > 0
        ? r.documents.map(
            (d) =>
              `  - 문서 "${d.title}"${d.summary ? ` (요약: ${d.summary})` : ''}\n${d.passages.map((p) => `    · ${p.replace(/\s+/g, ' ').slice(0, 400)}`).join('\n')}`,
          )
        : ['  - (관련 문서 없음)']),
    ].join('\n'),
  );

  return [
    '당신은 사내 ERP의 FAQ 답변을 쓰는 어시스턴트입니다. 아래 질문마다 FAQ 답변을 한국어 2~3문장으로 작성하세요.',
    '',
    '[규칙]',
    '1. 답변은 "참고 문서"의 본문 또는 "화면 안내"에 실제로 적힌 내용만 근거로 쓴다. 근거에 없는 숫자·기간·절차·이름을 만들지 않는다.',
    '2. 문서 내용을 쓸 때는 문서 제목을 한 번 언급한다. 문서가 질문이 묻는 바에 직접 답하지 않으면(주제만 비슷한 경우 포함) 그 문서는 무시한다.',
    '   예: "내 근태 현황 알려줘", "재고가 부족한 품목은?"처럼 지금의 데이터를 조회하는 질문은 규정·매뉴얼 내용을 설명하지 말고, AI 어시스턴트에 물어보거나 해당 화면에서 확인할 수 있다고 안내한다.',
    '3. "담당자에게 문의하세요", "관련 메뉴에서 확인하세요"처럼 내용이 없는 안내만으로는 답변을 만들지 않는다. 구체적인 화면 이름과 그 화면에서 할 수 있는 일을 함께 쓸 수 있을 때만 화면 안내로 답한다.',
    '4. 근거가 부족하면 answer를 null로 둔다(사람이 직접 쓰도록 후보에서 제외된다).',
    '',
    '[화면 안내]',
    ...SCREEN_GUIDE.map((line) => `- ${line}`),
    '',
    '[질문과 참고 문서]',
    ...blocks,
    '',
    '정확히 이 JSON 스키마의 배열로만 응답하세요: [{ "id": string, "answer": string | null }]',
  ].join('\n');
}

export function parseClusters(text: string | undefined): FaqCluster[] {
  const parsed: unknown = JSON.parse(text ?? '[]');
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (c): c is FaqCluster =>
      typeof c === 'object' &&
      c !== null &&
      typeof (c as FaqCluster).representativeQuestion === 'string' &&
      typeof (c as FaqCluster).matchedCount === 'number',
  );
}

/** 모델이 JSON null 대신 문자열로 "근거 없음"을 돌려주는 경우가 있어(실제로 "null"이 답변으로 저장된 적이 있다) 함께 걸러낸다 */
const NO_ANSWER_TEXTS = new Set(['null', 'none', 'n/a', 'undefined', '없음', '해당 없음']);

/** id → 답변. 비어 있거나 문자열이 아닌 답변, "null" 같은 자리표시 문자열은 근거 없음으로 보고 넣지 않는다 */
export function parseAnswers(text: string | undefined): Map<string, string> {
  const parsed: unknown = JSON.parse(text ?? '[]');
  const answers = new Map<string, string>();
  if (!Array.isArray(parsed)) return answers;
  for (const item of parsed) {
    if (typeof item !== 'object' || item === null) continue;
    const { id, answer } = item as { id?: unknown; answer?: unknown };
    if (typeof id !== 'string' || typeof answer !== 'string') continue;
    const text = answer.trim();
    if (text && !NO_ANSWER_TEXTS.has(text.toLowerCase())) answers.set(id, text);
  }
  return answers;
}
