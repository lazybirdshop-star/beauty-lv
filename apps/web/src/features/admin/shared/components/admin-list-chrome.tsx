'use client';

import type { ReactNode } from 'react';

import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

import type { AdminListPage } from '../types';
import type { AdminPageList } from '../use-admin-page';

/**
 * Обвязка списков панели платформы — по артборду `AdminMasters.dc.html`.
 *
 * Один набор на семь экранов: у мастеров, салонов, пользователей, заявок,
 * записей, подписок и журнала в макете одна и та же форма — поиск и выгрузка в
 * шапке, ряд отборов под ней, таблица карточкой и подвал со страницами. Копия
 * этой обвязки в семи файлах жила бы ровно до первой правки.
 */

/**
 * Поиск. Поле из набора, а не примитив продукта: в макете у него своя высота,
 * своя рамка и подсказка клавиши справа.
 */
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
    <label className="search admin-search" style={{ width }}>
      <Icon name="search" className="ico-18" />
      <input
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
    <button type="button" className="btn btn-secondary" onClick={onExport} disabled={exporting}>
      <Icon name="download" className="ico-18" />
      <span>{exporting ? t.common.processing : t.admin.exportCsv}</span>
    </button>
  );
}

export interface FilterOption<T extends string> {
  key: T;
  label: string;
}

/**
 * Отбор чипсом. Внутри — настоящий `<select>`.
 *
 * В макете чипс нарисован закрытым списком со стрелкой, и первым побуждением
 * было собрать своё меню. Родной `select` открывается там, где человек привык,
 * ходит стрелками, ищет по первой букве и на телефоне превращается в колесо
 * системы. Ни одно из этого своё меню бесплатно не даёт.
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
    <label className={value === options[0]?.key ? 'chip admin-chip' : 'chip admin-chip is-on'}>
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

/** Ряд отборов и подпись сортировки справа — верхняя строка макета. */
export function AdminFilterRow({ children, sortedBy }: { children: ReactNode; sortedBy: string }) {
  return (
    <div className="admin-filter-row">
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        {children}
      </div>
      <span className="t-meta">{sortedBy}</span>
    </div>
  );
}

/**
 * Подвал таблицы: какие строки видны из скольких и две кнопки.
 *
 * Страницами, а не догрузкой: в макете стоят «Назад» и «Далее», и для работы
 * поддержки это правильнее — список отсортирован, и вопрос «кто на второй
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
      <span className="t-meta">{fmt(t.admin.pageRange, { from, to, total })}</span>
      <div className="row" style={{ gap: 4 }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={busy || offset === 0}
          onClick={() => onOffsetChange(Math.max(0, offset - limit))}
        >
          <span>{t.admin.previousPage}</span>
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={busy || to >= total}
          onClick={() => onOffsetChange(offset + limit)}
        >
          <span>{t.admin.nextPage}</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Таблица списка целиком: карточка, прокрутка, пустота, подвал со страницами —
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
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="admin-table">
        <table className="table dense">
          <thead>{head}</thead>
          <tbody>{children}</tbody>
        </table>
      </div>

      {list.items.length === 0 ? (
        <p className="t-meta" style={{ padding: '32px 18px', textAlign: 'center' }}>
          {empty}
        </p>
      ) : null}

      <AdminPager
        offset={list.offset}
        limit={list.limit}
        total={list.total}
        onOffsetChange={list.setOffset}
        busy={list.isFetching}
      />
    </div>
  );
}
