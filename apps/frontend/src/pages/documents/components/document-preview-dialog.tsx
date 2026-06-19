import { Sparkles, FileText, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getVersionHistory } from '@/pages/documents/api/documents-api';
import type { AppDocument } from '@/mocks/documents';

interface DocumentPreviewDialogProps {
  document: AppDocument | null;
  onOpenChange: (open: boolean) => void;
}

function DocumentPreviewDialog({ document, onOpenChange }: DocumentPreviewDialogProps) {
  if (!document) return null;
  const history = getVersionHistory(document.id);

  return (
    <Dialog open={Boolean(document)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="flex-row items-center justify-between">
          <DialogTitle>{document.title}</DialogTitle>
          <Button variant="secondary" size="sm">
            <Download /> 다운로드
          </Button>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-[1.4fr_1fr]">
          <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-md bg-gray-50 text-muted-foreground">
            <FileText className="size-10" />
            <p className="text-xs">{document.fileType} 미리보기</p>
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ai-accent">
                <Sparkles className="size-3.5" /> AI 요약
              </p>
              <p className="text-sm text-muted-foreground">
                {document.indexStatus === 'DONE'
                  ? document.summary || '요약 정보가 없습니다.'
                  : '색인이 완료되면 AI 요약이 자동 생성됩니다.'}
              </p>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">버전 이력 ({history.length || 1})</p>
              <div className="flex flex-col gap-1 text-sm">
                {history.length > 0 ? (
                  history.map((h) => (
                    <div key={h.version} className="flex items-center justify-between text-muted-foreground">
                      <span>v{h.version}</span>
                      <span className="tabular-nums">{h.date}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>v{document.version}</span>
                    <span className="tabular-nums">{document.createdAt}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { DocumentPreviewDialog };
