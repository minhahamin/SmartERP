import { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useReuploadDocument } from '@/pages/documents/hooks/use-documents';
import type { AppDocument } from '@/mocks/documents';

interface ReuploadFormDialogProps {
  document: AppDocument | null;
  onOpenChange: (open: boolean) => void;
}

function ReuploadFormDialog({ document, onOpenChange }: ReuploadFormDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const reupload = useReuploadDocument();

  if (!document) return null;

  const handleSubmit = () => {
    if (!file) return;
    const fileType = file.name.split('.').pop()?.toUpperCase() ?? document.fileType;
    reupload.mutate(
      { id: document.id, input: { fileType, fileSize: file.size } },
      {
        onSuccess: () => {
          onOpenChange(false);
          setFile(null);
        },
      },
    );
  };

  return (
    <Dialog open={Boolean(document)} onOpenChange={(open) => { onOpenChange(open); if (!open) setFile(null); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>새 버전 업로드</DialogTitle>
          <DialogDescription>
            '{document.title}'의 새 버전(v{document.version + 1})을 업로드합니다. 이전 버전은 버전 이력에 보존됩니다.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div
            onClick={() => inputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border py-8 text-center hover:border-primary/50"
          >
            <UploadCloud className="size-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{file ? file.name : '교체할 파일을 선택하세요'}</p>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button type="button" disabled={!file} loading={reupload.isPending} onClick={handleSubmit}>
            업로드
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { ReuploadFormDialog };
