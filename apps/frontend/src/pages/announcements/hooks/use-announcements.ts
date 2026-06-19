import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAnnouncement,
  listAnnouncements,
  markAnnouncementRead,
  type CreateAnnouncementInput,
} from '@/pages/announcements/api/announcements-api';
import { toast } from '@/stores/toast-store';

const ANNOUNCEMENTS_KEY = ['announcements'] as const;

export function useAnnouncements() {
  return useQuery({ queryKey: ANNOUNCEMENTS_KEY, queryFn: listAnnouncements });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAnnouncementInput) => createAnnouncement(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ANNOUNCEMENTS_KEY });
      toast({ title: '공지사항이 게시되었습니다.', variant: 'success' });
    },
  });
}

export function useMarkAnnouncementRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markAnnouncementRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ANNOUNCEMENTS_KEY });
    },
  });
}
