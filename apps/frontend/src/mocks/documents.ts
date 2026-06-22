export type DocumentIndexStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';

export interface DocumentVersionEntry {
  version: number;
  date: string;
}

export interface AppDocument {
  id: string;
  title: string;
  folderId: string;
  version: number;
  fileType: string;
  fileSize: number;
  indexStatus: DocumentIndexStatus;
  isPublic: boolean;
  uploadedBy: string;
  summary: string;
  createdAt: string;
  /** 과거 버전 이력(최신순). 새 버전을 올리면 직전 버전이 이 배열 맨 앞에 추가된다. */
  versionHistory: DocumentVersionEntry[];
}

export const DOCUMENTS: AppDocument[] = [
  {
    id: 'doc-1',
    title: '신입사원 연차 규정 v2',
    folderId: 'folder-policy',
    version: 2,
    fileType: 'PDF',
    fileSize: 482_000,
    indexStatus: 'DONE',
    isPublic: true,
    uploadedBy: 'emp-1042',
    summary: '입사 1년 미만 직원은 매월 1일 1개씩 연차가 발생하며, 입사 1년 이상은 연 15일이 기본 부여됩니다. (근로기준법 제60조 기준)',
    createdAt: '2026-05-01',
    versionHistory: [{ version: 1, date: '2024-01-01' }],
  },
  {
    id: 'doc-2',
    title: '2026 취업규칙',
    folderId: 'folder-policy',
    version: 1,
    fileType: 'PDF',
    fileSize: 1_240_000,
    indexStatus: 'DONE',
    isPublic: true,
    uploadedBy: 'emp-1042',
    summary: '근무시간, 휴게시간, 휴일/휴가, 복무규율, 징계 등 전사 공통 취업규칙을 정의합니다.',
    createdAt: '2026-01-01',
    versionHistory: [],
  },
  {
    id: 'doc-3',
    title: '대한물산 납품계약서',
    folderId: 'folder-contract',
    version: 1,
    fileType: 'PDF',
    fileSize: 318_000,
    indexStatus: 'PROCESSING',
    isPublic: false,
    uploadedBy: 'emp-1024',
    summary: '대한물산 대상 분기별 정기 납품 조건 및 단가, 결제 조건을 명시한 계약서입니다.',
    createdAt: '2026-06-17',
    versionHistory: [],
  },
  {
    id: 'doc-4',
    title: '6월 생산보고서',
    folderId: 'folder-report',
    version: 1,
    fileType: 'XLSX',
    fileSize: 96_000,
    indexStatus: 'PENDING',
    isPublic: true,
    uploadedBy: 'emp-1031',
    summary: '',
    createdAt: '2026-06-19',
    versionHistory: [],
  },
  {
    id: 'doc-5',
    title: 'ERP 사용 매뉴얼',
    folderId: 'folder-manual',
    version: 3,
    fileType: 'PDF',
    fileSize: 2_100_000,
    indexStatus: 'DONE',
    isPublic: true,
    uploadedBy: 'emp-1000',
    summary: 'ERPilot의 모듈별 사용 방법과 AI 업무 도우미 활용 가이드를 담은 사내 매뉴얼입니다.',
    createdAt: '2026-03-15',
    versionHistory: [
      { version: 2, date: '2025-06-01' },
      { version: 1, date: '2024-09-01' },
    ],
  },
  {
    id: 'doc-6',
    title: '인사평가 가이드',
    folderId: 'folder-hr',
    version: 1,
    fileType: 'PDF',
    fileSize: 540_000,
    indexStatus: 'DONE',
    isPublic: false,
    uploadedBy: 'emp-1042',
    summary: '반기별 인사평가 절차, 평가 등급 기준, 이의제기 절차를 안내합니다.',
    createdAt: '2026-02-10',
    versionHistory: [],
  },
];
