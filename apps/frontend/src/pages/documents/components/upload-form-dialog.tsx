import { useEffect, useState, type FormEvent } from 'react';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUploadDocument } from '@/pages/documents/hooks/use-documents';
import { useAuthStore } from '@/stores/auth-store';
import { CATEGORY_LABEL, type DocumentCategory } from '@/mocks/documents';

interface UploadFormDialogProps {
  file: File | null;
  onOpenChange: (open: boolean) => void;
}

function UploadFormDialog({ file, onOpenChange }: UploadFormDialogProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('ETC');
  const user = useAuthStore((state) => state.user);
  const uploadDocument = useUploadDocument();

  useEffect(() => {
    if (file) setTitle(file.name.replace(/\.[^/.]+$/, ''));
  }, [file]);

  if (!file) return null;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    const fileType = file.name.split('.').pop()?.toUpperCase() ?? 'FILE';
    uploadDocument.mutate(
      { title, category, fileType, fileSize: file.size, uploadedBy: user.id },
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
              <Label>카테고리</Label>
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
