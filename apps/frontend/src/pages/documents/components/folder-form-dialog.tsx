import { useEffect, useState, type FormEvent } from 'react';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateDocumentFolder, useUpdateDocumentFolder } from '@/pages/documents/hooks/use-folders';
import type { DocumentFolder } from '@/mocks/document-folders';

interface FolderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder?: DocumentFolder;
}

function FolderFormDialog({ open, onOpenChange, folder }: FolderFormDialogProps) {
  const [name, setName] = useState('');
  const createFolder = useCreateDocumentFolder();
  const updateFolder = useUpdateDocumentFolder();
  const isEdit = Boolean(folder);
  const isSubmitting = createFolder.isPending || updateFolder.isPending;

  useEffect(() => {
    if (open) setName(folder?.name ?? '');
  }, [open, folder]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (isEdit && folder) {
      updateFolder.mutate({ id: folder.id, input: { name } }, { onSuccess: () => onOpenChange(false) });
    } else {
      createFolder.mutate({ name }, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? '폴더명 수정' : '폴더 생성'}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="folder-name">폴더명</Label>
              <Input id="folder-name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? '저장' : '생성'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { FolderFormDialog };
