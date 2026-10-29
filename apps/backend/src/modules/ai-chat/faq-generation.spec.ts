import {
  FAQ_MAX_CANDIDATES,
  buildAnswerPrompt,
  buildClusterPrompt,
  parseAnswers,
  parseClusters,
} from './faq-generation';
import { AiChatService } from './ai-chat.service';

describe('FAQ 생성 프롬프트·해석', () => {
  it('클러스터링 프롬프트는 답변을 요구하지 않는다', () => {
    const prompt = buildClusterPrompt([{ sample: '연차 규정 알려줘', count: 3 }], 3);
    expect(prompt).toContain('답변은 쓰지 않습니다');
    expect(prompt).not.toContain('"answer"');
    expect(prompt).toContain('- 연차 규정 알려줘 | 3');
  });

  it('답변 프롬프트는 근거 문서와 화면 안내를 담고, 근거가 없으면 null로 두라고 못 박는다', () => {
    const prompt = buildAnswerPrompt([
      { id: '0', question: '병가는 며칠까지?', documents: [{ title: '연차 및 휴가 운영 지침', summary: null, passages: ['병가는 연 30일 이내'] }] },
      { id: '1', question: '주차 등록은?', documents: [] },
    ]);
    expect(prompt).toContain('문서 "연차 및 휴가 운영 지침"');
    expect(prompt).toContain('병가는 연 30일 이내');
    expect(prompt).toContain('(관련 문서 없음)');
    expect(prompt).toContain('answer를 null로 둔다');
    expect(prompt).toContain('[화면 안내]');
    expect(prompt).toContain('데이터를 조회하는 질문은 규정·매뉴얼 내용을 설명하지 말고');
  });

  it('잘못된 모양의 응답은 걸러낸다', () => {
    expect(parseClusters('{"a":1}')).toEqual([]);
    expect(parseClusters('[{"representativeQuestion":"q","matchedCount":3,"category":"c"},{"x":1}]')).toHaveLength(1);
    const answers = parseAnswers('[{"id":"0","answer":" 답 "},{"id":"1","answer":null},{"id":"2","answer":"  "},{"answer":"x"}]');
    expect([...answers.entries()]).toEqual([['0', '답']]);
    // 모델이 JSON null 대신 문자열로 "근거 없음"을 돌려준 경우도 답변으로 취급하지 않는다
    expect(parseAnswers('[{"id":"0","answer":"null"},{"id":"1","answer":"None"},{"id":"2","answer":"없음"}]').size).toBe(0);
  });
});

describe('AiChatService.generateFaqCandidatesForCompany — 근거 기반 답변', () => {
  function build(modelReplies: string[]) {
    const prisma = {
      chatMessage: { findMany: jest.fn().mockResolvedValue(Array.from({ length: 6 }, () => ({ content: '병가는 며칠까지 쓸 수 있어?' }))) },
      faqItem: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: `id-${data.question}`, ...data })),
      },
    };
    const rag = {
      search: jest.fn().mockImplementation((_c: string, _d: unknown, q: string) =>
        Promise.resolve(q.includes('병가') ? [{ documentId: 'd1', title: '연차 및 휴가 운영 지침', category: 'HR', summary: null, passages: ['병가는 연 30일 이내'] }] : []),
      ),
    };
    const generateContent = jest.fn();
    modelReplies.forEach((text) => generateContent.mockResolvedValueOnce({ text }));
    const config = { get: jest.fn((k: string) => (k === 'GEMINI_API_KEY' ? 'key' : undefined)) };
    const service = new AiChatService(prisma as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never, rag as never, config as never);
    (service as unknown as { gemini: unknown }).gemini = { models: { generateContent } };
    return { service, prisma, rag, generateContent };
  }

  const clusters = JSON.stringify([
    { representativeQuestion: '병가는 며칠까지 쓸 수 있어?', category: '인사/휴가', matchedCount: 6 },
    { representativeQuestion: '주차 등록은 어떻게 해?', category: '기타', matchedCount: 5 },
  ]);

  it('문서 근거가 있는 후보만 답변과 함께 만들고, 근거가 없는 후보는 건너뛴다', async () => {
    const { service, prisma, generateContent } = build([
      clusters,
      JSON.stringify([
        { id: '0', answer: '연차 및 휴가 운영 지침에 따르면 병가는 연 30일 이내로 사용할 수 있습니다.' },
        { id: '1', answer: null },
      ]),
    ]);

    const result = await service.generateFaqCandidatesForCompany('c1', 5);

    expect(generateContent).toHaveBeenCalledTimes(2); // 묶기 1회 + 답변 1회(후보 수와 무관)
    expect(result).toMatchObject({ candidatesCreated: 1, skippedNoEvidence: 1 });
    expect(prisma.faqItem.create).toHaveBeenCalledTimes(1);
    expect(prisma.faqItem.create.mock.calls[0][0].data).toMatchObject({
      question: '병가는 며칠까지 쓸 수 있어?',
      isPublished: false,
      sourceType: 'AI_GENERATED',
    });
  });

  it('FAQ는 전 직원에게 보이므로 부서 전용 문서가 섞이지 않게 공개 문서만 검색한다', async () => {
    const { service, rag } = build([clusters, JSON.stringify([])]);
    await service.generateFaqCandidatesForCompany('c1', 5);
    for (const call of rag.search.mock.calls) expect(call[1]).toBeNull();
  });

  it('기준 미달 후보와 이미 있는 질문은 답변 작성 호출 대상에서 제외한다', async () => {
    const { service, prisma, generateContent } = build([
      JSON.stringify([{ representativeQuestion: '병가는 며칠까지 쓸 수 있어?', category: '인사', matchedCount: 2 }]),
    ]);
    prisma.faqItem.findMany.mockResolvedValue([{ question: '병가는 며칠까지 쓸 수 있어?' }]);
    const result = await service.generateFaqCandidatesForCompany('c1', 5);
    expect(result.candidatesCreated).toBe(0);
    expect(generateContent).toHaveBeenCalledTimes(1); // 답변 작성 단계는 대상이 없어 호출하지 않는다
  });

  it(`한 번에 최대 ${FAQ_MAX_CANDIDATES}개 후보까지만 답변을 쓴다`, async () => {
    const many = Array.from({ length: FAQ_MAX_CANDIDATES + 5 }, (_, i) => ({ representativeQuestion: `질문 ${i}`, category: '기타', matchedCount: 9 }));
    const { service, rag } = build([JSON.stringify(many), JSON.stringify([])]);
    await service.generateFaqCandidatesForCompany('c1', 5);
    expect(rag.search).toHaveBeenCalledTimes(FAQ_MAX_CANDIDATES);
  });
});
