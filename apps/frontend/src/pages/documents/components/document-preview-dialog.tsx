import { useEffect, useState } from 'react';
import { Sparkles, FileText, Download, UploadCloud } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { fetchDocumentFileUrl, type AppDocument } from '@/pages/documents/api/documents-api';

interface DocumentPreviewDialogProps {
  document: AppDocument | null;
  onOpenChange: (open: boolean) => void;
  onReupload: (document: AppDocument) => void;
}

function DocumentPreviewDialog({ document, onOpenChange, onReupload }: DocumentPreviewDialogProps) {
  // 문서 원본은 인증 기반 :id/file 로 blob을 받아 표시한다 (/uploads 직접 접근은 서버에서 차단)
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('download');

  useEffect(() => {
    if (!document) return;
    let revoked = false;
    let objectUrl: string | null = null;
    setFileUrl(null);
    fetchDocumentFileUrl(document.id)
      .then(({ url, filename }) => {
        if (revoked) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setFileUrl(url);
        setFileName(filename);
      })
      .catch(() => {
        if (!revoked) setFileUrl(null);
      });
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [document]);

  if (!document) return null;

  return (
    <Dialog open={Boolean(document)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="flex-row items-center justify-between">
          <DialogTitle>{document.title}</DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => onReupload(document)}>
              <UploadCloud /> 새 버전 업로드
            </Button>
            <Button variant="secondary" size="sm" asChild disabled={!fileUrl}>
              <a href={fileUrl ?? undefined} download={fileName} target="_blank" rel="noreferrer">
                <Download /> 다운로드
              </a>
            </Button>
          </div>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-[1.4fr_1fr]">
          {document.fileType === 'application/pdf' ? (
            fileUrl ? (
              <iframe
                title={document.title}
                src={fileUrl}
                className="h-80 w-full rounded-md border border-border md:h-full"
              />
            ) : (
              <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-md bg-gray-50 text-muted-foreground">
                <FileText className="size-10" />
                <p className="text-xs">파일을 불러오는 중입니다</p>
              </div>
            )
          ) : (
            <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-md bg-gray-50 text-muted-foreground">
              <FileText className="size-10" />
              <p className="text-xs">{document.fileType} 파일은 미리보기를 지원하지 않습니다</p>
            </div>
          )}
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ai-accent">
                <Sparkles className="size-3.5" /> AI 요약
              </p>
              <p className="text-sm text-muted-foreground">
                {document.indexStatus === 'DONE'
                  ? document.summary || '요약 정보가 없습니다.'
                  : document.indexStatus === 'FAILED'
                    ? 'AI 색인에 실패했습니다.'
                    : '색인이 완료되면 AI 요약이 자동 생성됩니다.'}
              </p>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">버전</p>
              <div className="flex items-center justify-between text-sm text-foreground">
                <span className="font-medium">v{document.version} (현재)</span>
                <span className="tabular-nums">{document.createdAt.slice(0, 10)}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { DocumentPreviewDialog };
