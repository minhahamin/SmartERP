export interface DocumentFolder {
  id: string;
  name: string;
}

export const DOCUMENT_FOLDERS_SEED: DocumentFolder[] = [
  { id: 'folder-policy', name: '정책/규정' },
  { id: 'folder-contract', name: '계약서' },
  { id: 'folder-report', name: '보고서' },
  { id: 'folder-manual', name: '매뉴얼' },
  { id: 'folder-hr', name: '인사' },
  { id: 'folder-etc', name: '기타' },
];
