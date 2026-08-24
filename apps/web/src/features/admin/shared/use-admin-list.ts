'use client';

import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { useDebouncedValue } from '@/lib/use-debounced-value';

import { ADMIN_PAGE_SIZE, type AdminListPage } from './types';

interface AdminListInput<T, F extends Record<string, string | undefined>> {
  /** Корень ключа кеша: `['admin-masters']`. Фильтры и запрос дописываются сюда. */
  key: readonly unknown[];
  filters: F;
  fetchPage: (
    params: F & { query?: string; limit: number; offset: number },
  ) => Promise<AdminListPage<T>>;
}

export interface AdminList<T> {
  items: T[];
  /** Сколько строк подходит под фильтр всего — включая ещё не загруженные. */
  total: number;
  query: string;
  setQuery: (value: string) => void;
  isLoading: boolean;
  isError: boolean;
  /** Повтор запроса после сетевого сбоя — то, что предлагает `LoadError`. */
  retry: () => void;
  /** Есть ли что догружать — то есть показывать ли кнопку. */
  hasMore: boolean;
  loadMore: () => void;
  isLoadingMore: boolean;
}

/**
 * Список админки: поиск на сервере, страницы по требованию.
 *
 * До этого оба списка выгружали таблицу целиком и фильтровали её в браузере.
 * Работало ровно до тех пор, пока мастеров было тридцать. Здесь и поиск, и
 * фильтры — часть запроса, поэтому цена экрана перестаёт зависеть от размера
 * платформы.
 *
 * `keepPreviousData` — не украшение: без него каждая набранная буква на
 * мгновение опустошает список, и человек печатает в мигающий экран.
 * Предыдущие результаты остаются на месте, пока не придут новые.
 */
export function useAdminList<T, F extends Record<string, string | undefined>>({
  key,
  filters,
  fetchPage,
}: AdminListInput<T, F>): AdminList<T> {
  const [query, setQuery] = useState('');
  /* Поиск уходит на сервер, поэтому пауза длиннее, чем у подсказки в поле:
     запрос на каждую букву — это десять запросов за слово. */
  const debounced = useDebouncedValue(query.trim(), 300);

  const result = useInfiniteQuery({
    queryKey: [...key, filters, debounced],
    queryFn: ({ pageParam }) =>
      fetchPage({ ...filters, query: debounced, limit: ADMIN_PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.items.length, 0);
      /* `undefined` означает «дальше нечего»: именно так react-query гасит
         кнопку. Сравнение с `total`, а не с размером страницы — последняя
         страница может прийти полной ровно по границе. */
      return loaded < lastPage.total ? loaded : undefined;
    },
    placeholderData: keepPreviousData,
  });

  const pages = result.data?.pages ?? [];

  return {
    items: pages.flatMap((page) => page.items),
    total: pages[0]?.total ?? 0,
    query,
    setQuery,
    isLoading: result.isPending,
    isError: result.isError,
    retry: () => void result.refetch(),
    hasMore: result.hasNextPage,
    loadMore: () => void result.fetchNextPage(),
    isLoadingMore: result.isFetchingNextPage,
  };
}
