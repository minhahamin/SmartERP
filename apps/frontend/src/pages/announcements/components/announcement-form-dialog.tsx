import { useEffect, useState, type FormEvent } from 'react';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateAnnouncement, useUpdateAnnouncement } from '@/pages/announcements/hooks/use-announcements';
import { useRoleOptions } from '@/pages/employees/hooks/use-employees';
import { roleLabel } from '@/types/auth';
import type { Announcement } from '@/pages/announcements/api/announcements-api';

interface AnnouncementFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement?: Announcement;
}

const ALL_ROLES = 'ALL';

const EMPTY_FORM = { title: '', content: '', targetRoleId: ALL_ROLES, isPinned: false };

function AnnouncementFormDialog({ open, onOpenChange, announcement }: AnnouncementFormDialogProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const createAnnouncement = useCreateAnnouncement();
  const updateAnnouncement = useUpdateAnnouncement();
  const { data: roles } = useRoleOptions();
  const isEdit = Boolean(announcement);
  const isSubmitting = createAnnouncement.isPending || updateAnnouncement.isPending;

  useEffect(() => {
    if (open) {
      setForm(
        announcement
          ? {
              title: announcement.title,
              content: announcement.content,
              targetRoleId: announcement.targetRoleId ?? ALL_ROLES,
              isPinned: announcement.isPinned,
            }
          : EMPTY_FORM,
      );
    }
  }, [open, announcement]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const input = {
      title: form.title,
      content: form.content,
      isPinned: form.isPinned,
      targetRoleId: form.targetRoleId === ALL_ROLES ? undefined : form.targetRoleId,
    };
    if (isEdit && announcement) {
      updateAnnouncement.mutate({ id: announcement.id, input }, { onSuccess: () => onOpenChange(false) });
      return;
    }
    createAnnouncement.mutate(input, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? '공지사항 수정' : '공지사항 작성'}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ann-title">제목</Label>
              <Input id="ann-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ann-content">내용 (Markdown)</Label>
              <Textarea id="ann-content" required rows={6} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label>대상 범위</Label>
                <Select value={form.targetRoleId} onValueChange={(targetRoleId) => setForm({ ...form, targetRoleId })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_ROLES}>전사</SelectItem>
                    {(roles ?? []).map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {roleLabel(role.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Label className="flex items-center gap-2 pt-5">
                <Checkbox checked={form.isPinned} onCheckedChange={(checked) => setForm({ ...form, isPinned: checked === true })} />
                상단 고정
              </Label>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? '저장' : '게시'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { AnnouncementFormDialog };
