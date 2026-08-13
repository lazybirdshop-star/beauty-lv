'use client';

import {
  describePageDesignChanges,
  type PageDesign,
  type PageDesignChange,
  type PageDesignHandle,
} from '@amolie/shared-kernel';
import { ArrowRight } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { formatDateTime } from '@/lib/format';
import { fmt, useT, type Messages } from '@/lib/i18n';

import type { PageDesignVersion } from '../api';

const HANDLE_LABEL: Record<PageDesignHandle, keyof Messages['studio']> = {
  style: 'handleStyle',
  accent: 'handleAccent',
  accentTo: 'accentToColor',
  ink: 'handleInk',
  border: 'handleBorder',
  surfaceTint: 'surfaceTint',
  heroPhoto: 'handleHeroPhoto',
  heroVideo: 'handleHeroVideo',
  background: 'handleBackground',
  masterPhoto: 'handleMasterPhoto',
  buttons: 'handleButtons',
  cards: 'handleCards',
  edge: 'edgeWeight',
  typography: 'handleTypography',
  motion: 'handleMotion',
};

/**
 * Перечень изменений словами — не диф токенов (DESIGN_STUDIO.md §7.2).
 *
 * Мастер подтверждает решение, которое узнаёт: «Стиль: Мягкий → FUNK», а не
 * список переменных. Ссылки укорачиваются до имени файла:
 * адрес на четыре строки в сводке читается как ошибка, а не как решение.
 */
function ChangeLine({ change }: { change: PageDesignChange }) {
  const t = useT();
  const short = (value: string | null) => {
    if (!value) return t.studio.valueNone;
    if (!/^https?:\/\//.test(value)) return value;
    const tail = value.split('/').pop() ?? value;
    return tail.length > 28 ? `${tail.slice(0, 27)}…` : tail;
  };

  return (
    <li className="flex items-baseline gap-2 py-1.5">
      <span className="shrink-0 text-xs font-semibold text-ink">
        {t.studio[HANDLE_LABEL[change.handle]]}
      </span>
      <span className="flex min-w-0 flex-1 items-baseline gap-1.5 text-xs text-ink-soft">
        <span className="truncate line-through decoration-ink-faint">{short(change.from)}</span>
        <ArrowRight size={12} aria-hidden="true" className="shrink-0 text-ink-faint" />
        <span className="truncate font-semibold text-ink">{short(change.to)}</span>
      </span>
    </li>
  );
}

export function PublishSheet({
  open,
  onOpenChange,
  published,
  draft,
  publishing,
  error,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  published: PageDesign;
  draft: PageDesign;
  publishing: boolean;
  error: boolean;
  onConfirm: () => void;
}) {
  const t = useT();
  const changes = describePageDesignChanges(published, draft);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t.studio.publishTitle}
      description={t.studio.publishText}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button className="flex-1" onClick={onConfirm} disabled={publishing}>
            {publishing ? t.studio.publishing : t.studio.publishConfirm}
          </Button>
        </div>
      }
    >
      {changes.length === 0 ? (
        <p className="text-sm text-ink-soft">{t.studio.nothingToPublish}</p>
      ) : (
        <ul className="divide-y divide-border">
          {changes.map((change) => (
            <ChangeLine key={change.handle} change={change} />
          ))}
        </ul>
      )}

      {error ? (
        /* Что произошло и что делать дальше, без кодов; черновик при этом не
           тронут ни на байт (§8). */
        <p className="mt-3 rounded-xl bg-danger-soft px-3 py-2.5 text-xs text-danger">
          {t.studio.publishError}
        </p>
      ) : null}
    </Sheet>
  );
}

/**
 * История: десять последних публикаций с датой и сводкой (§7.3).
 *
 * Откат — одна кнопка и новая публикация старого слепка. История
 * продолжается, а не переписывается, поэтому возврат в списке назван
 * возвратом, а не выглядит как повтор.
 */
export function HistorySheet({
  open,
  onOpenChange,
  versions,
  onRollback,
  locale,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versions: PageDesignVersion[];
  onRollback: (version: number) => void;
  locale: string;
}) {
  const t = useT();

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t.studio.history}>
      {versions.length === 0 ? (
        <p className="text-sm text-ink-soft">{t.studio.historyEmpty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {versions.map((version, index) => (
            <li key={version.version} className="flex items-center gap-3 py-3">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">
                  {fmt(t.studio.historyVersion, { version: version.version })}
                </span>
                <span className="mt-0.5 block text-xs text-ink-soft">
                  {formatDateTime(version.publishedAt, locale)}
                  {version.revertedFromVersion
                    ? ` · ${fmt(t.studio.historyRolledBack, {
                        version: version.revertedFromVersion,
                      })}`
                    : ''}
                </span>
              </span>
              {/* Текущая публикация — не кнопка: возвращать к ней нечего. */}
              {index === 0 ? null : (
                <Button size="sm" variant="secondary" onClick={() => onRollback(version.version)}>
                  {t.studio.historyRollback}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
