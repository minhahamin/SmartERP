import { DOCUMENT_FOLDERS_SEED, type DocumentFolder } from '@/mocks/document-folders';
import { getDocumentSnapshot } from '@/mocks/document-store';

/**
 * 문서 관리의 폴더(분류) 마스터. 기존에는 고정 enum(POLICY/CONTRACT/...)이었지만,
 * 창고 관리와 동일한 패턴으로 사용자가 직접 폴더를 추가/이름변경/삭제할 수 있도록 가변 store로 둔다.
 */
let folderStore: DocumentFolder[] = [...DOCUMENT_FOLDERS_SEED];

export function getDocumentFolders(): DocumentFolder[] {
  return folderStore;
}

export function getDocumentFolderById(id: string): DocumentFolder | undefined {
  return folderStore.find((f) => f.id === id);
}

export interface DocumentFolderInput {
  name: string;
}

export function createDocumentFolderRecord(input: DocumentFolderInput): DocumentFolder {
  const folder: DocumentFolder = { id: `folder-${Date.now()}`, ...input };
  folderStore = [...folderStore, folder];
  return folder;
}

export function updateDocumentFolderRecord(id: string, input: DocumentFolderInput): DocumentFolder {
  folderStore = folderStore.map((f) => (f.id === id ? { ...f, ...input } : f));
  const updated = getDocumentFolderById(id);
  if (!updated) throw new Error('폴더를 찾을 수 없습니다.');
  return updated;
}

export function deleteDocumentFolderRecord(id: string): void {
  if (folderStore.length <= 1) {
    throw new Error('최소 1개의 폴더는 유지되어야 합니다.');
  }
  if (getDocumentSnapshot().some((doc) => doc.folderId === id)) {
    throw new Error('이 폴더에 문서가 남아있어 삭제할 수 없습니다. 문서를 먼저 다른 폴더로 옮기거나 삭제해주세요.');
  }
  folderStore = folderStore.filter((f) => f.id !== id);
}
