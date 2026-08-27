'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { Input } from '@/components/ui/input';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { describeApiError } from '@/lib/describe-api-error';
import { formatDate } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

import { createAnnouncement, listAnnouncements, removeAnnouncement } from '../api';
import type { AdminAnnouncement } from '../api';

const PAGE = { limit: 50, offset: 0 };

function isLive(announcement: AdminAnnouncement): boolean {
  const now = Date.now();
  return (
    new Date(announcement.startsAt).getTime() <= now &&
    (!announcement.endsAt || new Date(announcement.endsAt).getTime() > now)
  );
}

/**
 * Объявления платформы — единственный канал, которым продукт говорит со всеми
 * мастерами сразу.
 *
 * Форма стоит сверху и всегда открыта: раздел открывают, чтобы написать, а не
 * чтобы полистать историю. Дата окончания необязательна, но подсказка рядом
 * объясняет, почему её стоит поставить.
 */
export function AnnouncementsScreen() {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [removing, setRemoving] = useState<AdminAnnouncement | null>(null);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: () => listAnnouncements(PAGE),
  });

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });

  const create = useMutation({
    mutationFn: createAnnouncement,
    onSuccess: () => {
      setTitle('');
      setBody('');
      setEndsAt('');
      invalidate();
      toast({ message: t.announcements.published });
    },
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  const remove = useMutation({
    mutationFn: removeAnnouncement,
    onSuccess: () => {
      setRemoving(null);
      invalidate();
      toast({ message: t.announcements.removed });
    },
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  function submit(event: FormEvent): void {
    event.preventDefault();
    create.mutate({
      title: title.trim(),
      body: body.trim(),
      /* Пустая строка из поля даты — это «не задано», а не полночь 1970-го. */
      endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t.announcements.newTitle}</CardTitle>
        </CardHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          {/* Видимые подписи, а не одни плейсхолдеры: плейсхолдер исчезает,
              как только в поле появляется текст, и человек, вернувшийся к
              наполовину заполненной форме, не знает, что в каком поле. Соседнее
              «Показывать до» это правило соблюдало, а два поля выше — нет. */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="announcement-title" className="text-sm text-ink-soft">
              {t.announcements.titleLabel}
            </label>
            <Input
              id="announcement-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t.announcements.titlePlaceholder}
              required
              minLength={3}
              maxLength={120}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="announcement-body" className="text-sm text-ink-soft">
              {t.announcements.bodyLabel}
            </label>
            <Textarea
              id="announcement-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={t.announcements.bodyPlaceholder}
              required
              minLength={10}
              maxLength={2000}
              rows={3}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ends-at" className="text-sm text-ink-soft">
              {t.announcements.endsAtLabel}
            </label>
            <Input
              id="ends-at"
              type="date"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
            />
            <span className="text-sm text-ink-faint">{t.announcements.endsAtHint}</span>
          </div>
          <Button type="submit" disabled={create.isPending} className="self-start">
            {create.isPending ? t.common.saving : t.announcements.publish}
          </Button>
        </form>
      </Card>

      {isError ? (
        <LoadError onRetry={() => void refetch()} />
      ) : isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : data.items.length > 0 ? (
        data.items.map((announcement) => (
          <Card key={announcement.id} className="flex flex-col gap-2.5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[15px] font-semibold text-ink">{announcement.title}</p>
              {isLive(announcement) ? (
                <Badge tone="success">{t.announcements.live}</Badge>
              ) : (
                <Badge tone="neutral">{t.announcements.finished}</Badge>
              )}
            </div>
            <p className="whitespace-pre-line text-sm text-ink-soft">{announcement.body}</p>
            <p className="text-sm text-ink-faint">
              {formatDate(announcement.startsAt, locale)}
              {announcement.endsAt ? ` — ${formatDate(announcement.endsAt, locale)}` : ''} ·{' '}
              {fmt(t.announcements.readBy, { count: announcement.dismissedBy })}
              {announcement.authorName ? ` · ${announcement.authorName}` : ''}
            </p>
            <Button
              size="sm"
              variant="secondary"
              className="self-start"
              onClick={() => setRemoving(announcement)}
            >
              {t.announcements.remove}
            </Button>
          </Card>
        ))
      ) : (
        <Card className="py-12 text-center text-sm text-ink-soft">{t.announcements.empty}</Card>
      )}

      <ConfirmSheet
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={t.announcements.removeTitle}
        description={t.announcements.removeDescription}
        confirmLabel={t.announcements.remove}
        loading={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing.id)}
      />
    </div>
  );
}
