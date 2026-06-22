import type { AppDocument } from '@/mocks/documents';
import {
  addDocument,
  getDocumentSnapshot,
  patchDocument,
  removeAllDocuments,
  removeDocuments,
  scheduleIndexing,
} from '@/mocks/document-store';
import { delay } from '@/mocks/delay';

const TODAY = '2026-06-19';

export interface DocumentListQuery {
  folderId?: string;
}

export async function listDocuments(query: DocumentListQuery): Promise<AppDocument[]> {
  await delay();
  let items = [...getDocumentSnapshot()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  if (query.folderId) items = items.filter((d) => d.folderId === query.folderId);
  return items;
}

export interface UploadDocumentInput {
  title: string;
  folderId: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
}

export async function uploadDocument(input: UploadDocumentInput): Promise<AppDocument> {
  await delay(300);
  const doc: AppDocument = {
    id: `doc-${Date.now()}`,
    version: 1,
    isPublic: true,
    summary: '',
    createdAt: TODAY,
    indexStatus: 'PENDING',
    versionHistory: [],
    ...input,
  };
  addDocument(doc);
  scheduleIndexing(doc.id);
  return doc;
}

export interface ReuploadDocumentInput {
  fileType: string;
  fileSize: number;
}

/** 기존 문서에 새 버전을 업로드한다 — 직전 버전은 versionHistory에 보존하고 색인을 다시 PENDING부터 진행한다. */
export async function reuploadDocument(documentId: string, input: ReuploadDocumentInput): Promise<AppDocument> {
  await delay(350);
  const current = getDocumentSnapshot().find((d) => d.id === documentId);
  if (!current) throw new Error('문서를 찾을 수 없습니다.');

  const updated = patchDocument(documentId, {
    version: current.version + 1,
    fileType: input.fileType,
    fileSize: input.fileSize,
    createdAt: TODAY,
    indexStatus: 'PENDING',
    versionHistory: [{ version: current.version, date: current.createdAt }, ...current.versionHistory],
  });
  scheduleIndexing(documentId);
  return updated;
}

export async function deleteDocuments(ids: string[]): Promise<void> {
  await delay(350);
  removeDocuments(ids);
}

export async function deleteAllDocuments(): Promise<void> {
  await delay(350);
  removeAllDocuments();
}
