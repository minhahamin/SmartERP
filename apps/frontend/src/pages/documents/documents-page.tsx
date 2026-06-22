import { useState } from 'react';
import { Folder, Pencil, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { cn } from '@/lib/utils';
import { UploadDropzone } from '@/pages/documents/components/upload-dropzone';
import { UploadFormDialog } from '@/pages/documents/components/upload-form-dialog';
import { DocumentTable } from '@/pages/documents/components/document-table';
import { DocumentPreviewDialog } from '@/pages/documents/components/document-preview-dialog';
import { ReuploadFormDialog } from '@/pages/documents/components/reupload-form-dialog';
import { FolderFormDialog } from '@/pages/documents/components/folder-form-dialog';
import { useDeleteAllDocuments, useDeleteDocuments, useDocuments } from '@/pages/documents/hooks/use-documents';
import { useDeleteDocumentFolder, useDocumentFolders } from '@/pages/documents/hooks/use-folders';
import type { AppDocument } from '@/mocks/documents';
import type { DocumentFolder } from '@/mocks/document-folders';

function DocumentsPage() {
  const [folderId, setFolderId] = useState<string>('ALL');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewDoc, setPreviewDoc] = useState<AppDocument | null>(null);
  const [reuploadDoc, setReuploadDoc] = useState<AppDocument | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [folderFormOpen, setFolderFormOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<DocumentFolder | undefined>(undefined);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<DocumentFolder | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);

  const { data: folders, isLoading: foldersLoading } = useDocumentFolders();
  const { data: documents, isLoading } = useDocuments({ folderId: folderId === 'ALL' ? undefined : folderId });
  const deleteDocuments = useDeleteDocuments();
  const deleteAllDocuments = useDeleteAllDocuments();
  const deleteFolder = useDeleteDocumentFolder();

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!documents) return;
    setSelectedIds((prev) => (documents.every((d) => prev.has(d.id)) ? new Set() : new Set(documents.map((d) => d.id))));
  };

  const selectFolder = (id: string) => {
    setFolderId(id);
    setSelectedIds(new Set());
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="문서 관리" description="사내 문서를 업로드하고 AI 색인 상태를 관리합니다." />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
        <Card className="flex flex-col gap-1 p-2">
          <button
            type="button"
            onClick={() => selectFolder('ALL')}
            className={cn(
              'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm',
              folderId === 'ALL' ? 'bg-primary-soft font-medium text-primary-soft-foreground' : 'text-foreground hover:bg-secondary',
            )}
          >
            <Folder className="size-3.5" /> 전체
          </button>

          {foldersLoading || !folders ? (
            <Skeleton className="h-24" />
          ) : (
            folders.map((folder) => (
              <div key={folder.id} className="group flex items-center justify-between rounded-md px-1">
                <button
                  type="button"
                  onClick={() => selectFolder(folder.id)}
                  className={cn(
                    'flex flex-1 items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-sm',
                    folderId === folder.id ? 'bg-primary-soft font-medium text-primary-soft-foreground' : 'text-foreground hover:bg-secondary',
                  )}
                >
                  <Folder className="size-3.5 shrink-0" />
                  <span className="truncate">{folder.name}</span>
                </button>
                <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
                  <button
                    type="button"
                    aria-label="폴더명 수정"
                    onClick={() => {
                      setEditingFolder(folder);
                      setFolderFormOpen(true);
                    }}
                    className="flex size-6 items-center justify-center rounded-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <Pencil className="size-3" />
                  </button>
                  <button
                    type="button"
                    aria-label="폴더 삭제"
                    onClick={() => setDeleteFolderTarget(folder)}
                    className="flex size-6 items-center justify-center rounded-sm text-muted-foreground hover:bg-secondary hover:text-destructive"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
            ))
          )}

          <button
            type="button"
            onClick={() => {
              setEditingFolder(undefined);
              setFolderFormOpen(true);
            }}
            className="mt-1 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-primary hover:bg-primary-soft"
          >
            <Plus className="size-3.5" /> 새 폴더
          </button>
        </Card>

        <div className="flex flex-col gap-4">
          <UploadDropzone onFileSelected={setPendingFile} />

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {selectedIds.size > 0 ? `${selectedIds.size}건 선택됨` : `전체 ${documents?.length ?? 0}건`}
            </p>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <Button variant="secondary" size="sm" onClick={() => setBulkDeleteOpen(true)}>
                  <Trash2 /> 선택 삭제 ({selectedIds.size})
                </Button>
              )}
              {documents && documents.length > 0 && (
                <Button variant="secondary" size="sm" onClick={() => setDeleteAllOpen(true)}>
                  <Trash2 /> 전체 삭제
                </Button>
              )}
            </div>
          </div>

          <Card className="overflow-hidden p-0">
            {isLoading || !documents ? (
              <div className="flex flex-col gap-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : (
              <DocumentTable
                documents={documents}
                onRowClick={setPreviewDoc}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onToggleSelectAll={toggleSelectAll}
              />
            )}
          </Card>
        </div>
      </div>

      <UploadFormDialog file={pendingFile} onOpenChange={(open) => !open && setPendingFile(null)} defaultFolderId={folderId} />
      <DocumentPreviewDialog
        document={previewDoc}
        onOpenChange={(open) => !open && setPreviewDoc(null)}
        onReupload={(doc) => {
          setPreviewDoc(null);
          setReuploadDoc(doc);
        }}
      />
      <ReuploadFormDialog document={reuploadDoc} onOpenChange={(open) => !open && setReuploadDoc(null)} />
      <FolderFormDialog open={folderFormOpen} onOpenChange={setFolderFormOpen} folder={editingFolder} />

      <ConfirmDialog
        open={Boolean(deleteFolderTarget)}
        onOpenChange={(open) => !open && setDeleteFolderTarget(null)}
        title={`'${deleteFolderTarget?.name}' 폴더를 삭제할까요?`}
        description="폴더에 문서가 남아있으면 삭제할 수 없습니다."
        confirmLabel="삭제"
        variant="danger"
        loading={deleteFolder.isPending}
        onConfirm={() => {
          if (!deleteFolderTarget) return;
          deleteFolder.mutate(deleteFolderTarget.id, { onSuccess: () => setDeleteFolderTarget(null) });
        }}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`선택한 문서 ${selectedIds.size}건을 삭제할까요?`}
        description="삭제된 문서는 복구할 수 없습니다."
        confirmLabel="삭제"
        variant="danger"
        loading={deleteDocuments.isPending}
        onConfirm={() => {
          deleteDocuments.mutate(Array.from(selectedIds), {
            onSuccess: () => {
              setSelectedIds(new Set());
              setBulkDeleteOpen(false);
            },
          });
        }}
      />

      <ConfirmDialog
        open={deleteAllOpen}
        onOpenChange={setDeleteAllOpen}
        title="전체 문서를 삭제할까요?"
        description={`현재 보이는 ${documents?.length ?? 0}건이 아니라 전체 문서가 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel="전체 삭제"
        variant="danger"
        loading={deleteAllDocuments.isPending}
        onConfirm={() => {
          deleteAllDocuments.mutate(undefined, {
            onSuccess: () => {
              setSelectedIds(new Set());
              setDeleteAllOpen(false);
            },
          });
        }}
      />
    </div>
  );
}

export { DocumentsPage };
