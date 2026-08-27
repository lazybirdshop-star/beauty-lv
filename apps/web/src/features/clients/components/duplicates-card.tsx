'use client';

import { UsersThree } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPhone } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

import { preferredClient, type DuplicateGroup } from '../duplicates';

/**
 * Две карточки одного человека — и предложение их склеить.
 *
 * Не тихая пометка на строках списка, а отдельный блок наверху: дубль это
 * задача («сделай с этим что-нибудь»), а не свойство клиента. Помеченные
 * строки мастер пролистывает, и через полгода их становится десять.
 *
 * Блока нет вовсе, когда дублей нет, — и это самое частое состояние. Пустой
 * блок «дубликатов не найдено» занимал бы место над списком у всех и всегда
 * ради сообщения, которое никому не нужно.
 */
export function DuplicatesCard({
  groups,
  onMerge,
  mergingKey,
}: {
  groups: DuplicateGroup[];
  onMerge: (keep: string, merge: string[]) => void;
  /** Ключ группы, которая сейчас сливается, — чтобы гасить только её кнопку. */
  mergingKey: string | null;
}) {
  const t = useT();

  if (groups.length === 0) return null;

  return (
    <Card className="flex flex-col gap-3">
      <CardHeader>
        <CardTitle>
          <span className="flex items-center gap-2">
            <UsersThree size={18} aria-hidden="true" />
            {t.clients.duplicatesTitle}
          </span>
        </CardTitle>
      </CardHeader>

      {/* Сказано, почему это дубли, а не «похожие»: один номер, значит одна
          история визитов. Мастер должна понимать, что склеивает, а не верить
          продукту на слово. */}
      <p className="text-sm text-ink-soft">{t.clients.duplicatesHint}</p>

      <ul className="flex flex-col gap-2">
        {groups.map((group) => {
          const keep = preferredClient(group.clients);
          const others = group.clients.filter((client) => client.id !== keep.id);

          return (
            <li
              key={group.matchKey}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-bg-sunken px-4 py-3"
            >
              <span className="min-w-0">
                {/* Имена всех карточек группы, а не только оставляемой: мастер
                    узнаёт человека по имени, и «Аня» с «Анна Берзиня» — это
                    ровно то, что она сейчас видит дважды. */}
                <span className="block truncate text-sm font-semibold text-ink">
                  {group.clients.map((client) => client.fullName).join(' · ')}
                </span>
                <span className="mt-0.5 block text-xs tabular-nums text-ink-soft">
                  {formatPhone(keep.phone)}
                </span>
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={mergingKey !== null}
                onClick={() =>
                  onMerge(
                    keep.id,
                    others.map((client) => client.id),
                  )
                }
              >
                {mergingKey === group.matchKey
                  ? t.common.processing
                  : fmt(t.clients.duplicatesMerge, { name: keep.fullName })}
              </Button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
