'use client';

import { MagnifyingGlass } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * Обвязка списка админки: поиск, фильтры, догрузка.
 *
 * Три куска, которые до этого были скопированы в мастерах и в пользователях
 * дословно — вместе с версткой поля поиска и разметкой чипсов. Копия жила
 * ровно до первой правки: любое изменение в одном списке молча оставляло
 * второй прежним.
 */
export function AdminSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <MagnifyingGlass
        size={18}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
      />
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="pl-10"
      />
    </div>
  );
}

/**
 * Выгрузка рядом с поиском, а не под списком.
 *
 * Она относится к тому, что человек отфильтровал, — значит стоять должна там
 * же, где он фильтровал, и до того, как он начал листать.
 */
export function AdminExportButton({
  exporting,
  onExport,
}: {
  exporting: boolean;
  onExport: () => void;
}) {
  const t = useT();
  return (
    <Button variant="secondary" size="sm" onClick={onExport} disabled={exporting}>
      {exporting ? t.common.processing : t.admin.exportCsv}
    </Button>
  );
}

export interface FilterOption<T extends string> {
  key: T;
  label: string;
}

export function AdminFilters<T extends string>({
  options,
  value,
  onChange,
}: {
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          aria-pressed={value === option.key}
          onClick={() => onChange(option.key)}
          className={cn(
            'shrink-0 cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            value === option.key ? 'bg-accent text-accent-contrast' : 'bg-bg-sunken text-ink-soft',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Подвал списка: сколько показано из скольких и чем догрузить остальное.
 *
 * Счётчик виден всегда, а не только когда есть что догружать: «12 из 12» —
 * это ответ на вопрос «всё ли я вижу», который иначе задаётся прокруткой.
 */
export function AdminListFooter({
  shown,
  total,
  hasMore,
  onLoadMore,
  loading,
}: {
  shown: number;
  total: number;
  hasMore: boolean;
  onLoadMore: () => void;
  loading: boolean;
}) {
  const t = useT();
  if (shown === 0) return null;

  return (
    <div className="flex flex-col items-center gap-3 pt-1">
      <p className="text-sm text-ink-soft">
        {shown} {t.admin.outOf} {total}
      </p>
      {hasMore ? (
        <Button variant="secondary" onClick={onLoadMore} disabled={loading}>
          {loading ? t.common.loading : t.admin.loadMore}
        </Button>
      ) : null}
    </div>
  );
}
