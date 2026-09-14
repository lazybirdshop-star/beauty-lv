'use client';

import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

import type { AdminListPage } from '../types';
import type { AdminPageList } from '../use-admin-page';

/**
 * Обвязка списков панели платформы — `.filters`, `.table` и `.pager`
 * прототипа «Кабинет 2026».
 *
 * Один набор на семь экранов: у мастеров, салонов, пользователей, заявок,
 * записей, подписок и журнала одна и та же форма — поиск и выгрузка в шапке,
 * ряд отборов под ней, таблица ячейкой и подвал со страницами. Копия этой
 * обвязки в семи файлах жила бы ровно до первой правки.
 */

/** Поиск — ниша прототипа с лупой слева, та же, что у списков кабинета. */
export function AdminSearch({
  value,
  onChange,
  placeholder,
  width = 300,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  width?: number;
}) {
  return (
    <label className="panel-search admin-search" style={{ width }}>
      <Icon name="search" className="ico-18" />
      <input
        className="panel-search__input"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </label>
  );
}

export function AdminExportButton({
  exporting,
  onExport,
}: {
  exporting: boolean;
  onExport: () => void;
}) {
  const t = useT();
  return (
    <Button variant="ghost" size="sm" onClick={onExport} disabled={exporting}>
      <Icon name="download" className="ico-18" />
      <span>{exporting ? t.common.processing : t.admin.exportCsv}</span>
    </Button>
  );
}

export interface FilterOption<T extends string> {
  key: T;
  label: string;
}

/**
 * Отбор пилюлей. Внутри — настоящий `<select>`.
 *
 * Родной `select` открывается там, где человек привык, ходит стрелками, ищет
 * по первой букве и на телефоне превращается в колесо системы. Ни одно из
 * этого своё меню бесплатно не даёт. Выбранный отбор — розовой пилюлей:
 * видно, что список уже сужен.
 */
export function AdminChip<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: FilterOption<T>[];
  onChange: (value: T) => void;
}) {
  const current = options.find((option) => option.key === value) ?? options[0];

  return (
    <label className={value === options[0]?.key ? 'admin-chip' : 'admin-chip is-on'}>
      <span>
        {label} · {current?.label}
      </span>
      <Icon name="chevD" className="ico-16" />
      <select value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {label} · {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Ряд отборов и подпись сортировки справа. */
export function AdminFilterRow({ children, sortedBy }: { children: ReactNode; sortedBy: string }) {
  return (
    <div className="admin-filter-row">
      <div className="admin-filter-row__chips">{children}</div>
      <span className="admin-filter-row__sort">{sortedBy}</span>
    </div>
  );
}

/**
 * Подвал таблицы: какие строки видны из скольких и две кнопки.
 *
 * Страницами, а не догрузкой: список отсортирован, и вопрос «кто на второй
 * сотне» решается переходом, а не двумя минутами прокрутки. Диапазон назван
 * целиком («13–24 из 1284»), потому что иначе после перехода непонятно, куда
 * именно попал.
 */
export function AdminPager({
  offset,
  limit,
  total,
  onOffsetChange,
  busy,
}: {
  offset: number;
  limit: number;
  total: number;
  onOffsetChange: (offset: number) => void;
  busy: boolean;
}) {
  const t = useT();
  if (total === 0) return null;

  const from = offset + 1;
  const to = Math.min(offset + limit, total);

  return (
    <div className="admin-pager">
      <span className="tnum">{fmt(t.admin.pageRange, { from, to, total })}</span>
      <div className="admin-pager__btns">
        <Button
          variant="ghost"
          size="pill"
          disabled={busy || offset === 0}
          onClick={() => onOffsetChange(Math.max(0, offset - limit))}
        >
          {t.admin.previousPage}
        </Button>
        <Button
          variant="ghost"
          size="pill"
          disabled={busy || to >= total}
          onClick={() => onOffsetChange(offset + limit)}
        >
          {t.admin.nextPage}
        </Button>
      </div>
    </div>
  );
}

/**
 * Таблица списка целиком: ячейка, прокрутка, пустота, подвал со страницами —
 * и три состояния запроса вокруг них.
 *
 * Экран описывает только свои колонки и свои ячейки. Всё остальное у семи
 * списков панели одинаково, и повторять его семь раз значит семь раз чинить.
 */
export function AdminTable<T, P extends AdminListPage<T>>({
  list,
  head,
  empty,
  children,
}: {
  list: AdminPageList<T, P>;
  /** Строка `<tr>` заголовка — без обёртки `<thead>`. */
  head: ReactNode;
  empty: string;
  children: ReactNode;
}) {
  if (list.isError) return <LoadError onRetry={list.retry} />;
  if (list.isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <Card>
      <div className="admin-table">
        <table className="admin-table__table">
          <thead>{head}</thead>
          <tbody>{children}</tbody>
        </table>
      </div>

      {list.items.length === 0 ? <p className="admin-empty">{empty}</p> : null}

      <AdminPager
        offset={list.offset}
        limit={list.limit}
        total={list.total}
        onOffsetChange={list.setOffset}
        busy={list.isFetching}
      />
    </Card>
  );
}
