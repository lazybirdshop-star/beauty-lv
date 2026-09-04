'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { useDebouncedValue } from '@/lib/use-debounced-value';

import { ADMIN_PAGE_SIZE, type AdminListPage } from './types';

interface AdminPageInput<
  T,
  F extends Record<string, string | number | undefined>,
  P extends AdminListPage<T>,
> {
  /** Корень ключа кеша: `['admin-masters']`. Фильтры и запрос дописываются сюда. */
  key: readonly unknown[];
  filters: F;
  fetchPage: (params: F & { query?: string; limit: number; offset: number }) => Promise<P>;
  /** Размер страницы. По умолчанию тот же, что у API. */
  pageSize?: number;
  /**
   * Через сколько миллисекунд перечитывать список самому. `false` — не
   * перечитывать: живое обновление нужно журналу и очереди заявок, а таблице
   * мастеров оно только мешало бы — строка уезжала бы из-под курсора.
   */
  refetchInterval?: number | false;
}

export interface AdminPageList<T, P extends AdminListPage<T> = AdminListPage<T>> {
  items: T[];
  /** Весь ответ страницы — ради полей сверх `items` и `total`. */
  data: P | undefined;
  /** Сколько строк подходит под отбор всего — знаменатель подвала. */
  total: number;
  offset: number;
  limit: number;
  setOffset: (offset: number) => void;
  query: string;
  setQuery: (value: string) => void;
  isLoading: boolean;
  /** Идёт запрос поверх уже показанных строк — на нём гаснут кнопки страниц. */
  isFetching: boolean;
  isError: boolean;
  retry: () => void;
}

/**
 * Список панели платформы: поиск и отборы на сервере, строки страницами.
 *
 * Страницами, а не бесконечной догрузкой: в артбордах у подвала стоят «Назад»
 * и «Далее», и для работы поддержки это правильнее — список отсортирован, и
 * «кто на второй сотне» решается переходом, а не прокруткой.
 *
 * `keepPreviousData` — не украшение: без него каждая набранная буква и каждый
 * переход по страницам на мгновение опустошают таблицу, и человек работает с
 * мигающим экраном.
 *
 * Смена отбора или запроса возвращает на первую страницу. Иначе отбор,
 * выбранный со второй страницы, показывает пустоту там, где строк просто
 * меньше, чем `offset`.
 */
export function useAdminPage<
  T,
  F extends Record<string, string | number | undefined>,
  P extends AdminListPage<T> = AdminListPage<T>,
>({
  key,
  filters,
  fetchPage,
  pageSize = ADMIN_PAGE_SIZE,
  refetchInterval = false,
}: AdminPageInput<T, F, P>): AdminPageList<T, P> {
  const [query, setQuery] = useState('');
  /* Поиск уходит на сервер, поэтому пауза длиннее, чем у подсказки в поле:
     запрос на каждую букву — это десять запросов за слово. */
  const debounced = useDebouncedValue(query.trim(), 300);

  /*
   * Страница хранится вместе с отбором, к которому относится, а не отдельно
   * от него. Сброс на первую страницу получается сравнением, а не эффектом:
   * `setState` в эффекте — это лишний проход отрисовки, на котором запрос
   * успевает уйти со старым `offset`.
   */
  const scope = JSON.stringify([filters, debounced]);
  const [page, setPage] = useState({ scope, offset: 0 });
  const offset = page.scope === scope ? page.offset : 0;
  const setOffset = (next: number) => setPage({ scope, offset: next });

  const result = useQuery({
    queryKey: [...key, filters, debounced, offset, pageSize],
    queryFn: () => fetchPage({ ...filters, query: debounced, limit: pageSize, offset }),
    placeholderData: keepPreviousData,
    refetchInterval,
  });

  return {
    data: result.data,
    items: result.data?.items ?? [],
    total: result.data?.total ?? 0,
    offset,
    limit: pageSize,
    setOffset,
    query,
    setQuery,
    isLoading: result.isPending,
    isFetching: result.isFetching,
    isError: result.isError,
    retry: () => void result.refetch(),
  };
}
