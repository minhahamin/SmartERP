// seed.ts(회사 기본 계정)가 이미 실행된 뒤에 돌리는 FAQ 전용 시드.
// AI 어시스턴트 반복 질문이 실제로 쌓여서 FAQ로 정리된 것처럼 "게시됨"과 "검수 대기"를 모두 채운다.
// 재실행해도 중복 생성되지 않도록 이미 FaqItem이 있으면 건너뛴다.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const COMPANY_BIZ_REG_NO = '123-45-67890';

type FaqSeed = {
  question: string;
  answer: string;
  category: string;
  sourceType: 'AI_GENERATED' | 'MANUAL';
  isPublished: boolean;
  hitCount?: number;
};

const PUBLISHED: FaqSeed[] = [
  {
    question: '연차는 어떻게 신청하나요?',
    answer:
      'AI 어시스턴트에게 원하는 날짜와 휴가 유형을 말하면 신청 초안을 만들어줍니다. 화면에 뜨는 확인 카드에서 "확인하고 진행"을 눌러야 최종 접수됩니다.',
    category: '인사',
    sourceType: 'MANUAL',
    isPublished: true,
    hitCount: 42,
  },
  {
    question: '급여명세서는 어디서 확인하나요?',
    answer: '급여 관리 화면에서 본인의 월별 급여 내역과 상태(확정/지급완료)를 확인할 수 있습니다.',
    category: '인사',
    sourceType: 'MANUAL',
    isPublished: true,
    hitCount: 35,
  },
  {
    question: '재고가 부족한 품목은 어떻게 확인하나요?',
    answer: 'AI 어시스턴트에게 "재고 부족한 품목 알려줘"라고 물어보면 안전재고 미달 품목을 창고별로 바로 확인할 수 있습니다.',
    category: '재고',
    sourceType: 'AI_GENERATED',
    isPublished: true,
    hitCount: 28,
  },
  {
    question: '생산 오더 상태는 누가 변경하나요?',
    answer:
      '담당 매니저 또는 관리자가 생산 관리 화면에서 상태를 변경할 수 있습니다. AI 어시스턴트에게 요청하면 변경 초안을 만들어주고, 확인해야 최종 반영됩니다.',
    category: '생산',
    sourceType: 'AI_GENERATED',
    isPublished: true,
    hitCount: 19,
  },
  {
    question: '거래처 등급은 무엇을 기준으로 나뉘나요?',
    answer: 'A/B/C 등급으로 구분되며, 거래 규모와 신용도를 기준으로 영업 담당자가 거래처 관리 화면에서 설정합니다.',
    category: '영업',
    sourceType: 'MANUAL',
    isPublished: true,
    hitCount: 14,
  },
  {
    question: '공지사항 대상은 어떻게 설정하나요?',
    answer: '공지 작성 시 대상 역할을 지정하지 않으면 전사에 공개되고, 특정 역할을 지정하면 해당 역할에게만 표시됩니다.',
    category: '공지',
    sourceType: 'MANUAL',
    isPublished: true,
    hitCount: 11,
  },
  {
    question: 'AI 어시스턴트가 답하지 못하는 질문은 어떻게 하나요?',
    answer: '사내 문서 검색을 먼저 시도해보고, 그래도 안 되면 담당 부서에 문의해주세요. 반복되는 질문은 FAQ로 자동 등록되어 다음부터는 더 빠르게 답변됩니다.',
    category: '기타',
    sourceType: 'AI_GENERATED',
    isPublished: true,
    hitCount: 9,
  },
  {
    question: '입출고 이력은 어디서 확인하나요?',
    answer: '입출고 관리 화면에서 창고별 입고/출고/조정 이력을 조회할 수 있습니다.',
    category: '재고',
    sourceType: 'MANUAL',
    isPublished: true,
    hitCount: 7,
  },
];

const PENDING: FaqSeed[] = [
  {
    question: '제 연차 잔여일수가 화면마다 다르게 나와요',
    answer:
      '연차는 근로기준법 제60조 기준으로 실시간 계산됩니다. 최근 승인된 휴가 내역이 아직 반영 전이거나 새로고침이 필요한 경우 차이가 날 수 있습니다.',
    category: '인사',
    sourceType: 'AI_GENERATED',
    isPublished: false,
  },
  {
    question: '생산 라인 점검 일정은 어디서 보나요?',
    answer: '일정 관리 캘린더에서 회의/점검 등 전사 일정을 확인할 수 있습니다.',
    category: '생산',
    sourceType: 'AI_GENERATED',
    isPublished: false,
  },
  {
    question: '거래처 담당자를 변경하고 싶어요',
    answer: '거래처 관리 화면에서 관리자 권한으로 담당자를 재배정할 수 있습니다.',
    category: '영업',
    sourceType: 'AI_GENERATED',
    isPublished: false,
  },
  {
    question: '비밀번호를 잊어버렸어요',
    answer: "로그인 화면의 '비밀번호 찾기'를 이용하면 재설정 링크를 받을 수 있습니다.",
    category: '계정',
    sourceType: 'MANUAL',
    isPublished: false,
  },
];

async function main() {
  const company = await prisma.company.findUnique({ where: { bizRegNo: COMPANY_BIZ_REG_NO } });
  if (!company) throw new Error('prisma/seed.ts를 먼저 실행해 회사/기본 계정을 만들어주세요.');

  const existing = await prisma.faqItem.count({ where: { companyId: company.id } });
  if (existing > 0) {
    console.log('FAQ 데이터가 이미 존재합니다 — 건너뜁니다.');
    return;
  }

  const all = [...PUBLISHED, ...PENDING];
  for (const f of all) {
    await prisma.faqItem.create({
      data: {
        companyId: company.id,
        question: f.question,
        answer: f.answer,
        category: f.category,
        sourceType: f.sourceType,
        isPublished: f.isPublished,
        hitCount: f.hitCount ?? 0,
      },
    });
  }
  console.log(`FAQ ${PUBLISHED.length}건(게시) + ${PENDING.length}건(검수 대기) 생성 완료`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
