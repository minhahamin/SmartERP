import { useEffect, useState, type FormEvent } from 'react';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUploadDocument } from '@/pages/documents/hooks/use-documents';
import { useDocumentFolders } from '@/pages/documents/hooks/use-folders';
import type { DocumentCategory } from '@/pages/documents/api/documents-api';

const CATEGORY_LABEL: Record<DocumentCategory, string> = {
  POLICY: '정책/규정',
  CONTRACT: '계약서',
  REPORT: '보고서',
  MANUAL: '매뉴얼',
  HR: '인사',
  ETC: '기타',
};

interface UploadFormDialogProps {
  file: File | null;
  onOpenChange: (open: boolean) => void;
  defaultFolderId?: string;
}

function UploadFormDialog({ file, onOpenChange, defaultFolderId }: UploadFormDialogProps) {
  const [title, setTitle] = useState('');
  const [folderId, setFolderId] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('ETC');
  const uploadDocument = useUploadDocument();
  const { data: folders } = useDocumentFolders();

  useEffect(() => {
    if (file) {
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
      setFolderId(defaultFolderId && defaultFolderId !== 'ALL' ? defaultFolderId : (folders?.[0]?.id ?? ''));
      setCategory('ETC');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  if (!file) return null;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    uploadDocument.mutate(
      { title, category, folderId: folderId || undefined, file },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={Boolean(file)} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>문서 업로드</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="doc-title">제목</Label>
              <Input id="doc-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>폴더</Label>
              <Select value={folderId} onValueChange={setFolderId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(folders ?? []).map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>분류</Label>
              <Select value={category} onValueChange={(value) => setCategory(value as DocumentCategory)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              {file.name} · {(file.size / 1024).toFixed(0)}KB
            </p>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" loading={uploadDocument.isPending}>
              업로드
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { UploadFormDialog };
