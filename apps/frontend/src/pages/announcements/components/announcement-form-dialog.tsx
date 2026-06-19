import { useState, type FormEvent } from 'react';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateAnnouncement } from '@/pages/announcements/hooks/use-announcements';
import { useAuthStore } from '@/stores/auth-store';

interface AnnouncementFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SCOPE_OPTIONS = ['전사', '영업팀', '생산팀', '인사팀', '경영지원팀'];

function AnnouncementFormDialog({ open, onOpenChange }: AnnouncementFormDialogProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [scope, setScope] = useState('전사');
  const [isPinned, setIsPinned] = useState(false);
  const user = useAuthStore((state) => state.user);
  const createAnnouncement = useCreateAnnouncement();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    createAnnouncement.mutate(
      { title, content, scope, isPinned, authorId: user.id },
      {
        onSuccess: () => {
          onOpenChange(false);
          setTitle('');
          setContent('');
          setIsPinned(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>공지사항 작성</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ann-title">제목</Label>
              <Input id="ann-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ann-content">내용 (Markdown)</Label>
              <Textarea id="ann-content" required rows={6} value={content} onChange={(e) => setContent(e.target.value)} />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label>대상 범위</Label>
                <Select value={scope} onValueChange={setScope}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCOPE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Label className="flex items-center gap-2 pt-5">
                <Checkbox checked={isPinned} onCheckedChange={(checked) => setIsPinned(checked === true)} />
                상단 고정
              </Label>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" loading={createAnnouncement.isPending}>
              게시
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { AnnouncementFormDialog };
