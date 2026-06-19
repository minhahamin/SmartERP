import { useState } from 'react';
import { Folder } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { UploadDropzone } from '@/pages/documents/components/upload-dropzone';
import { UploadFormDialog } from '@/pages/documents/components/upload-form-dialog';
import { DocumentTable } from '@/pages/documents/components/document-table';
import { DocumentPreviewDialog } from '@/pages/documents/components/document-preview-dialog';
import { useDocuments } from '@/pages/documents/hooks/use-documents';
import { CATEGORY_LABEL, type AppDocument, type DocumentCategory } from '@/mocks/documents';

function DocumentsPage() {
  const [category, setCategory] = useState<DocumentCategory | 'ALL'>('ALL');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewDoc, setPreviewDoc] = useState<AppDocument | null>(null);
  const { data: documents, isLoading } = useDocuments({ category: category === 'ALL' ? undefined : category });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="문서 관리" description="사내 문서를 업로드하고 AI 색인 상태를 관리합니다." />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[200px_1fr]">
        <Card className="p-2">
          <nav className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => setCategory('ALL')}
              className={cn(
                'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm',
                category === 'ALL' ? 'bg-primary-soft font-medium text-primary-soft-foreground' : 'text-foreground hover:bg-secondary',
              )}
            >
              <Folder className="size-3.5" /> 전체
            </button>
            {Object.entries(CATEGORY_LABEL).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setCategory(key as DocumentCategory)}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm',
                  category === key ? 'bg-primary-soft font-medium text-primary-soft-foreground' : 'text-foreground hover:bg-secondary',
                )}
              >
                <Folder className="size-3.5" /> {label}
              </button>
            ))}
          </nav>
        </Card>

        <div className="flex flex-col gap-4">
          <UploadDropzone onFileSelected={setPendingFile} />
          <Card className="overflow-hidden p-0">
            {isLoading || !documents ? (
              <div className="flex flex-col gap-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : (
              <DocumentTable documents={documents} onRowClick={setPreviewDoc} />
            )}
          </Card>
        </div>
      </div>

      <UploadFormDialog file={pendingFile} onOpenChange={(open) => !open && setPendingFile(null)} />
      <DocumentPreviewDialog document={previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)} />
    </div>
  );
}

export { DocumentsPage };
