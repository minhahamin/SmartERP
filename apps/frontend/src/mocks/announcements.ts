export interface Announcement {
  id: string;
  title: string;
  content: string;
  scope: string;
  isPinned: boolean;
  authorId: string;
  readCount: number;
  totalTargetCount: number;
  publishedAt: string;
}

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    title: '2026년 하반기 근무제도 안내',
    content:
      '안녕하세요, 경영지원팀입니다.\n\n2026년 하반기부터 적용되는 근무제도 변경사항을 안내드립니다.\n\n- 시차출퇴근제 확대 적용 (08:00~10:00 사이 출근 선택)\n- 재택근무 주 1회 허용 (사전 승인 필요)\n- 연차 사용 촉진 캠페인 시행\n\n자세한 내용은 첨부된 사내 규정 문서를 참고해주세요.',
    scope: '전사',
    isPinned: true,
    authorId: 'emp-1000',
    readCount: 11,
    totalTargetCount: 15,
    publishedAt: '2026-06-15',
  },
  {
    id: 'ann-2',
    title: '7월 거래처 정기점검 일정 공유',
    content: '7월 첫째 주, 주요 거래처(대한물산/삼진산업/우진테크) 정기 방문 점검을 진행합니다. 담당자는 사전에 일정을 확인해주세요.',
    scope: '영업팀',
    isPinned: false,
    authorId: 'emp-1024',
    readCount: 4,
    totalTargetCount: 6,
    publishedAt: '2026-06-12',
  },
  {
    id: 'ann-3',
    title: '사내 문서 시스템 업데이트 안내',
    content: '문서 관리 모듈에 AI 기반 문서 검색/요약 기능이 추가되었습니다. 업로드된 문서는 자동으로 색인되어 AI 챗봇에서 검색 가능합니다.',
    scope: '전사',
    isPinned: false,
    authorId: 'emp-1000',
    readCount: 9,
    totalTargetCount: 15,
    publishedAt: '2026-06-10',
  },
  {
    id: 'ann-4',
    title: '보안 정책 업데이트 안내',
    content: '비밀번호 정책이 강화되어 8자 이상, 영문/숫자/특수문자 조합이 필수로 변경되었습니다. 다음 로그인 시 비밀번호 변경이 요청됩니다.',
    scope: '전사',
    isPinned: false,
    authorId: 'emp-1000',
    readCount: 6,
    totalTargetCount: 15,
    publishedAt: '2026-06-05',
  },
  {
    id: 'ann-5',
    title: '생산1팀 설비 점검 일정',
    content: '6월 넷째 주 1라인 설비 정기 점검이 예정되어 있습니다. 해당 기간 생산 오더 일정에 유의해주세요.',
    scope: '생산팀',
    isPinned: false,
    authorId: 'emp-1031',
    readCount: 3,
    totalTargetCount: 5,
    publishedAt: '2026-06-03',
  },
  {
    id: 'ann-6',
    title: '신규 입사자 환영 안내',
    content: '이번 달 노아인 사원이 생산1팀에 새로 합류했습니다. 따뜻하게 맞이해주세요!',
    scope: '전사',
    isPinned: false,
    authorId: 'emp-1042',
    readCount: 8,
    totalTargetCount: 15,
    publishedAt: '2026-05-28',
  },
];
