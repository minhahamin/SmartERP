import { DOCUMENTS, type AppDocument } from '@/mocks/documents';

/** 문서 관리 모듈과 폴더 관리(document-folder-store)가 함께 참조하는 단일 가변 소스. */
let documentStore: AppDocument[] = [...DOCUMENTS];

export function getDocumentSnapshot(): AppDocument[] {
  return documentStore;
}

export function getDocumentById(id: string): AppDocument | undefined {
  return documentStore.find((d) => d.id === id);
}

export function addDocument(doc: AppDocument): void {
  documentStore = [doc, ...documentStore];
}

export function patchDocument(id: string, patch: Partial<AppDocument>): AppDocument {
  documentStore = documentStore.map((d) => (d.id === id ? { ...d, ...patch } : d));
  const updated = getDocumentById(id);
  if (!updated) throw new Error('문서를 찾을 수 없습니다.');
  return updated;
}

export function removeDocuments(ids: string[]): void {
  const idSet = new Set(ids);
  documentStore = documentStore.filter((d) => !idSet.has(d.id));
}

export function removeAllDocuments(): void {
  documentStore = [];
}

/**
 * PENDING → PROCESSING → DONE 비동기 색인 전이를 모사한다(docs/10-rag-design.md).
 * 신규 업로드와 새 버전 재업로드 모두 이 함수를 거쳐 동일한 흐름을 탄다.
 */
export function scheduleIndexing(documentId: string): void {
  setTimeout(() => {
    if (getDocumentById(documentId)) patchDocument(documentId, { indexStatus: 'PROCESSING' });
  }, 1200);
  setTimeout(() => {
    const doc = getDocumentById(documentId);
    if (!doc) return;
    patchDocument(documentId, {
      indexStatus: 'DONE',
      summary: doc.summary || '업로드된 문서가 자동으로 색인되어 AI 챗봇 검색 대상에 포함되었습니다.',
    });
  }, 3200);
}
