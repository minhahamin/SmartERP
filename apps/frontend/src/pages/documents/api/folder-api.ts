import {
  createDocumentFolderRecord,
  deleteDocumentFolderRecord,
  getDocumentFolders,
  updateDocumentFolderRecord,
  type DocumentFolderInput,
} from '@/mocks/document-folder-store';
import { delay } from '@/mocks/delay';

export async function listDocumentFolders() {
  await delay(200);
  return getDocumentFolders();
}

export async function createDocumentFolder(input: DocumentFolderInput) {
  await delay(300);
  return createDocumentFolderRecord(input);
}

export async function updateDocumentFolder(id: string, input: DocumentFolderInput) {
  await delay(300);
  return updateDocumentFolderRecord(id, input);
}

export async function removeDocumentFolder(id: string) {
  await delay(300);
  deleteDocumentFolderRecord(id);
}
