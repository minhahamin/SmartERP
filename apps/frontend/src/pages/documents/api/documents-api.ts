import { apiClient, type ApiSuccess } from '@/lib/api/client';

export type DocumentCategory = 'POLICY' | 'CONTRACT' | 'REPORT' | 'MANUAL' | 'HR' | 'ETC';
export type DocumentIndexStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';

export interface AppDocument {
  id: string;
  title: string;
  category: DocumentCategory;
  folderId: string | null;
  version: number;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  indexStatus: DocumentIndexStatus;
  isPublic: boolean;
  uploadedBy: string;
  summary: string | null;
  createdAt: string;
}

/**
 * 문서 원본 다운로드 — 인증 기반 GET /documents/:id/file 을 blob으로 받아 object URL로 반환한다.
 * /uploads/documents 직접 접근은 서버에서 차단되어 있으므로 이 경유만 사용한다.
 * 호출자는 사용 후 URL.revokeObjectURL(url)로 해제한다.
 */
export async function fetchDocumentFileUrl(documentId: string): Promise<{ url: string; filename: string }> {
  const { data, headers } = await apiClient.get(`/documents/${documentId}/file`, { responseType: 'blob' });
  const blob = data as Blob;
  const disposition = (headers?.['content-disposition'] as string | undefined) ?? '';
  const match = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  const filename = match?.[1] ? decodeURIComponent(match[1]) : 'download';
  return { url: URL.createObjectURL(blob), filename };
}

export interface DocumentListQuery {
  folderId?: string;
}

export async function listDocuments(query: DocumentListQuery): Promise<AppDocument[]> {
  const { data } = await apiClient.get<ApiSuccess<AppDocument[]>>('/documents', {
    params: { folderId: query.folderId, page: 1, limit: 100 },
  });
  return data.data;
}

export interface UploadDocumentInput {
  title: string;
  category: DocumentCategory;
  folderId?: string;
  file: File;
}

export async function uploadDocument(input: UploadDocumentInput): Promise<AppDocument> {
  const formData = new FormData();
  formData.append('file', input.file);
  formData.append('title', input.title);
  formData.append('category', input.category);
  if (input.folderId) formData.append('folderId', input.folderId);

  const { data } = await apiClient.post<ApiSuccess<AppDocument>>('/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

export async function reuploadDocument(documentId: string, file: File): Promise<AppDocument> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post<ApiSuccess<AppDocument>>(`/documents/${documentId}/versions`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

export async function deleteDocuments(ids: string[]): Promise<void> {
  await apiClient.post('/documents/bulk-delete', { ids });
}

export async function deleteAllDocuments(): Promise<void> {
  await apiClient.delete('/documents');
}
