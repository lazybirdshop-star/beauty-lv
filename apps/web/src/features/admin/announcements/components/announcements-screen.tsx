'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { useToast } from '@/components/ui/toast';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { RowMenu } from '@/features/dashboard-shell/components/row-menu';
import { describeApiError } from '@/lib/describe-api-error';
import { formatDate } from '@/lib/format';
import { useLocale, useT, type Messages } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

import {
  AdminChip,
  AdminFilterRow,
  AdminTable,
  type FilterOption,
} from '../../shared/components/admin-list-chrome';
import { useAdminPage } from '../../shared/use-admin-page';
import {
  createAnnouncement,
  listAnnouncements,
  removeAnnouncement,
  type AdminAnnouncement,
  type AdminAnnouncementsFilters,
  type AnnouncementAudience,
  type AnnouncementState,
} from '../api';
import { AnnouncementSheet } from './announcement-sheet';

/**
 * Где объявление относительно текущего момента.
 *
 * Считается на экране из тех же двух дат, по которым его отбирает сервер: это
 * не второе мнение, а та же арифметика — «началось ли» и «не кончилось ли».
 */
function stateOf(announcement: AdminAnnouncement): AnnouncementState {
  const now = Date.now();
  if (new Date(announcement.startsAt).getTime() > now) return 'scheduled';
  if (announcement.endsAt && new Date(announcement.endsAt).getTime() <= now) return 'ended';
  return 'live';
}

function stateBadge(state: AnnouncementState, t: Messages) {
  const tone = state === 'live' ? 'b-green' : state === 'scheduled' ? 'b-lilac' : 'b-neutral';
  const label = {
    live: t.announcements.stateLive,
    scheduled: t.announcements.stateScheduled,
    ended: t.announcements.stateEnded,
  }[state];

  return (
    <span className={`badge ${tone}`}>
      <span className="dot" />
      {label}
    </span>
  );
}

function audienceLabel(audience: AnnouncementAudience | undefined, t: Messages): string {
  return {
    all: t.announcements.audienceAll,
    masters: t.announcements.audienceMasters,
    salons: t.announcements.audienceSalons,
  }[audience ?? 'all'];
}

/**
 * Объявления платформы — по артборду `AdminAnnouncements.dc.html`.
 *
 * Единственный канал, которым продукт говорит со всеми мастерами сразу.
 * Таблицей: вопрос, ради которого раздел открывают, — «что сейчас висит и у
 * кого», а на него отвечают колонки состояния, адресата и срока.
 */
export function AnnouncementsScreen() {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [state, setState] = useState<'all' | AnnouncementState>('all');
  const [audience, setAudience] = useState<'all' | AnnouncementAudience>('all');
  const [composing, setComposing] = useState(false);
  const [removing, setRemoving] = useState<AdminAnnouncement | null>(null);

  const filters: AdminAnnouncementsFilters = {
    state: state === 'all' ? undefined : state,
    /* «Всем» — это и отбор «все объявления», и адресат «all». Первый смысл
       побеждает: чипс со значением «Всем», прячущий объявления мастерам, читался
       бы как поломка. Адресата `all` находят его собственным пунктом. */
    audience: audience === 'all' ? undefined : audience,
  };

  const list = useAdminPage<AdminAnnouncement, AdminAnnouncementsFilters>({
    key: ['admin-announcements'],
    filters,
    fetchPage: listAnnouncements,
    pageSize: 25,
  });

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });

  const create = useMutation({
    mutationFn: createAnnouncement,
    onSuccess: () => {
      setComposing(false);
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

  const stateOptions: FilterOption<'all' | AnnouncementState>[] = [
    { key: 'all', label: t.admin.filterAll },
    { key: 'live', label: t.announcements.stateLive },
    { key: 'scheduled', label: t.announcements.stateScheduled },
    { key: 'ended', label: t.announcements.stateEnded },
  ];

  const audienceOptions: FilterOption<'all' | AnnouncementAudience>[] = [
    { key: 'all', label: t.admin.filterAll },
    { key: 'masters', label: t.announcements.audienceMasters },
    { key: 'salons', label: t.announcements.audienceSalons },
  ];

  return (
    <>
      <PageHeader
        title={t.nav.announcements}
        meta={t.announcements.meta}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setComposing(true)}>
            <Icon name="plus" className="ico-18" />
            <span>{t.announcements.create}</span>
          </button>
        }
      />

      <AdminFilterRow sortedBy={fmt(t.announcements.count, { count: list.total })}>
        <AdminChip
          label={t.announcements.filterState}
          value={state}
          options={stateOptions}
          onChange={setState}
        />
        <AdminChip
          label={t.announcements.filterAudience}
          value={audience}
          options={audienceOptions}
          onChange={setAudience}
        />
      </AdminFilterRow>

      <AdminTable
        list={list}
        empty={t.announcements.empty}
        head={
          <tr>
            <th>{t.announcements.colTitle}</th>
            <th style={{ width: 130 }}>{t.admin.colStatus}</th>
            <th style={{ width: 150 }}>{t.announcements.colAudience}</th>
            <th style={{ width: 200 }}>{t.announcements.colVisibility}</th>
            <th style={{ width: 120 }}>{t.announcements.colAuthor}</th>
            <th style={{ width: 40 }}>
              <span className="sr-only">{t.admin.colActions}</span>
            </th>
          </tr>
        }
      >
        {list.items.map((announcement) => (
          <tr key={announcement.id}>
            <td style={{ whiteSpace: 'normal' }}>
              <span style={{ fontWeight: 500 }}>{announcement.title}</span>
              <span className="t-meta" style={{ display: 'block', fontSize: 11.5 }}>
                {fmt(t.announcements.readBy, { count: announcement.dismissedBy })}
              </span>
            </td>
            <td>{stateBadge(stateOf(announcement), t)}</td>
            <td>{audienceLabel(announcement.audience, t)}</td>
            <td>
              <span className="t-meta">
                {announcement.endsAt
                  ? fmt(t.announcements.showsRange, {
                      from: formatDate(announcement.startsAt, locale),
                      to: formatDate(announcement.endsAt, locale),
                    })
                  : fmt(t.announcements.showsFrom, {
                      from: formatDate(announcement.startsAt, locale),
                    })}
              </span>
            </td>
            <td>
              <span className="t-meta">{announcement.authorName ?? '—'}</span>
            </td>
            <td>
              <RowMenu label={t.admin.rowActions}>
                <button type="button" onClick={() => setRemoving(announcement)}>
                  {t.announcements.remove}
                </button>
              </RowMenu>
            </td>
          </tr>
        ))}
      </AdminTable>

      <AnnouncementSheet
        open={composing}
        onOpenChange={setComposing}
        onSubmit={(input) => create.mutate(input)}
        submitting={create.isPending}
      />

      <ConfirmSheet
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={t.announcements.removeTitle}
        description={t.announcements.removeDescription}
        confirmLabel={t.announcements.remove}
        loading={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing.id)}
      />
    </>
  );
}
