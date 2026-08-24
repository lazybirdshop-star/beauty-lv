'use client';

import { PencilSimple, TrashSimple } from '@phosphor-icons/react';
import type { MouseEvent } from 'react';

import { useLocale, useT } from '@/lib/i18n';
import { fmt, plural } from '@/lib/i18n/messages';
import { useTimeZone } from '@/lib/timezone';
import type { Messages } from '@/lib/i18n/messages';
import { Badge } from '@/components/ui/badge';
import { RowAction } from '@/components/ui/row-action';
import { Card } from '@/components/ui/card';

import type { Client } from '../types';
import type { ClientVisitCounts } from '../types';
import { ClientFlagBadge } from './client-flag-badge';

interface ClientListItemProps {
  client: Client;
  /* Два числа, а не полная статистика: строка списка показывает «сколько раз»
     и «когда в последний раз», и оба приезжают с сервера вместе с клиентом.
     Любимая услуга живёт только в открытой карточке. */
  stats: ClientVisitCounts;
  onOpenDetail: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function formatLastVisit(
  iso: string | null,
  t: Messages,
  locale: string,
  timeZone?: string,
): string {
  if (!iso) return t.clients.noVisits;
  const date = new Date(iso).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    timeZone,
  });
  return fmt(t.clients.lastVisitOn, { date });
}

function stopPropagation(handler: () => void) {
  return (event: MouseEvent) => {
    event.stopPropagation();
    handler();
  };
}

export function ClientListItem({
  client,
  stats,
  onOpenDetail,
  onEdit,
  onDelete,
}: ClientListItemProps) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();
  return (
    /*
     * Карточка — контейнер, а не кнопка.
     *
     * Была `role="button"` с `tabIndex`, и внутри неё жили ещё две кнопки:
     * вложенные интерактивные элементы внутри `role="button"` — невалидный
     * ARIA (у роли презентационные потомки), а доступное имя строки вбирало
     * в себя весь текст карточки вместе с подписями «Изменить» и «Удалить».
     * Читалка объявляла одну кнопку с именем в полсотни слов.
     *
     * Открывает историю теперь имя клиента — настоящая кнопка с коротким
     * именем, как и две соседние. Нажатие мимо кнопок по-прежнему работает:
     * оно висит на контейнере обычным обработчиком, без роли и без фокуса,
     * — это ускорение для пальца, а не путь для клавиатуры, и второй остановки
     * табуляции на ту же цель больше не создаёт.
     */
    <Card
      onClick={onOpenDetail}
      className="flex cursor-pointer items-center justify-between gap-3 text-left"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={stopPropagation(onOpenDetail)}
            className="truncate rounded-full text-left text-[15px] font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {client.fullName}
          </button>
          <ClientFlagBadge flag={client.flag} />
          {client.isBlocked ? <Badge tone="danger">{t.clients.blocked}</Badge> : null}
        </div>
        <p className="mt-0.5 text-sm text-ink-soft">{client.phone}</p>
        <p className="mt-0.5 text-xs text-ink-faint">
          {stats.totalBookings}{' '}
          {plural(locale, stats.totalBookings, {
            zero: t.clients.visitCountZero,
            one: t.clients.visitCountOne,
            few: t.clients.visitCountFew,
            many: t.clients.visitCountMany,
            other: t.clients.visitCountOther,
          })}{' '}
          · {formatLastVisit(stats.lastVisitAt, t, locale, timeZone)}
        </p>
        {/* A private note is set apart rather than left to read as one more
            line of client data: a rule and the quieter ink say "this is what
            you wrote", not "this is what the client told you". */}
        {client.notes ? (
          <p className="mt-2 border-l-2 border-border-strong pl-2.5 text-sm text-ink-soft">
            {client.notes}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <RowAction
          label={t.common.edit}
          icon={<PencilSimple size={18} />}
          onClick={stopPropagation(onEdit)}
        />
        <RowAction
          label={t.common.delete}
          icon={<TrashSimple size={18} />}
          tone="danger"
          onClick={stopPropagation(onDelete)}
        />
      </div>
    </Card>
  );
}
