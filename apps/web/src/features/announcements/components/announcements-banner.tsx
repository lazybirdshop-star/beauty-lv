'use client';

import { Megaphone, X } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useT } from '@/lib/i18n';

import { dismissAnnouncement, listActiveAnnouncements, type Announcement } from '../api';

/**
 * Объявление платформы — в кабинете мастера, над содержимым экрана.
 *
 * Не всплывающее окно: сообщение «завтра с 9 до 11 обновление» не стоит того,
 * чтобы перекрывать календарь и требовать нажатия прежде, чем мастер увидит
 * записи на сегодня. Полоса читается за секунду, закрывается за одно нажатие
 * и не возвращается — отметка «прочитано» живёт на сервере, поэтому закрытое
 * на телефоне не всплывает на ноутбуке.
 *
 * Пока объявлений нет — не занимает ни пикселя: пустого состояния у этого
 * блока нет и быть не должно.
 */
export function AnnouncementsBanner() {
  const t = useT();
  const queryClient = useQueryClient();

  const { data: announcements } = useQuery({
    queryKey: ['announcements', 'active'],
    queryFn: listActiveAnnouncements,
    /* Молчание — норма, поэтому спрашиваем редко: объявление, увиденное на
       десять минут позже, ничего не теряет. */
    staleTime: 10 * 60_000,
  });

  const dismiss = useMutation({
    mutationFn: dismissAnnouncement,
    onMutate: async (announcementId: string) => {
      /* Полоса исчезает сразу, не дожидаясь сервера: закрытие — жест, а не
         операция, и ждать ответа здесь означало бы, что нажатие «не работает». */
      await queryClient.cancelQueries({ queryKey: ['announcements', 'active'] });
      const previous = queryClient.getQueryData<Announcement[]>(['announcements', 'active']);
      queryClient.setQueryData<Announcement[]>(['announcements', 'active'], (current) =>
        (current ?? []).filter((item) => item.id !== announcementId),
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      queryClient.setQueryData(['announcements', 'active'], context?.previous);
    },
  });

  if (!announcements || announcements.length === 0) return null;

  return (
    <div className="mb-5 flex flex-col gap-2">
      {announcements.map((announcement) => (
        <div
          key={announcement.id}
          role="status"
          className="flex items-start gap-3 rounded-2xl bg-accent-soft px-4 py-3.5"
        >
          <Megaphone size={20} weight="fill" className="mt-0.5 shrink-0 text-accent" />
          <div className="min-w-0 grow">
            <p className="text-[15px] font-semibold text-ink">{announcement.title}</p>
            <p className="mt-0.5 whitespace-pre-line text-sm text-ink-soft">{announcement.body}</p>
          </div>
          <button
            type="button"
            onClick={() => dismiss.mutate(announcement.id)}
            aria-label={t.common.close}
            className="-m-1.5 shrink-0 cursor-pointer rounded-full p-1.5 text-ink-faint hover:bg-bg-sunken hover:text-ink"
          >
            <X size={18} weight="bold" />
          </button>
        </div>
      ))}
    </div>
  );
}
