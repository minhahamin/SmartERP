import { DOCUMENTS, VERSION_HISTORY, type AppDocument, type DocumentCategory } from '@/mocks/documents';
import { delay } from '@/mocks/delay';

let documentDb: AppDocument[] = [...DOCUMENTS];

export interface DocumentListQuery {
  category?: DocumentCategory;
}

export async function listDocuments(query: DocumentListQuery): Promise<AppDocument[]> {
  await delay();
  let items = [...documentDb].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  if (query.category) items = items.filter((d) => d.category === query.category);
  return items;
}

export function getVersionHistory(documentId: string) {
  return VERSION_HISTORY[documentId] ?? [];
}

export interface UploadDocumentInput {
  title: string;
  category: DocumentCategory;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
}

/**
 * 업로드 직후 PENDING으로 생성하고, RAG 색인 파이프라인(텍스트추출→Chunking→Embedding)을
 * 모사해 PROCESSING → DONE으로 비동기 전환한다(docs/10-rag-design.md).
 */
export async function uploadDocument(input: UploadDocumentInput): Promise<AppDocument> {
  await delay(300);
  const doc: AppDocument = {
    id: `doc-${Date.now()}`,
    version: 1,
    isPublic: true,
    summary: '',
    createdAt: '2026-06-19',
    indexStatus: 'PENDING',
    ...input,
  };
  documentDb = [doc, ...documentDb];

  setTimeout(() => {
    documentDb = documentDb.map((d) => (d.id === doc.id ? { ...d, indexStatus: 'PROCESSING' as const } : d));
  }, 1200);
  setTimeout(() => {
    documentDb = documentDb.map((d) =>
      d.id === doc.id ? { ...d, indexStatus: 'DONE' as const, summary: '업로드된 문서가 자동으로 색인되어 AI 챗봇 검색 대상에 포함되었습니다.' } : d,
    );
  }, 3200);

  return doc;
}
