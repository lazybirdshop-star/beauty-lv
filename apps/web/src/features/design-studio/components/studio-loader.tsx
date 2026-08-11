'use client';

import { useQuery } from '@tanstack/react-query';

import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { getMyOrganization } from '@/features/organization-profile/api';

import { getPageDesignState } from '../api';

import { StudioScreen } from './studio-screen';

/**
 * Загрузка режима: организация мастера и состояние её облика.
 *
 * Два запроса, а не один: организация уже лежит в кеше кабинета (тот же ключ
 * `my-organization`), а состояние Студии — черновик, публикация и история —
 * принадлежит только этому режиму и не должно попадать в каждый экран
 * кабинета.
 *
 * Состояния честные (§8): скелетон в пропорциях экрана, а не спиннер, и
 * разговорная ошибка вместо кода.
 */
export function StudioLoader({ slug }: { slug: string }) {
  const organization = useQuery({ queryKey: ['my-organization'], queryFn: getMyOrganization });
  const design = useQuery({
    queryKey: ['page-design', slug],
    queryFn: () => getPageDesignState(slug),
    /* Черновик — источник истины на сервере, но правит его эта же вкладка:
       перезапрос при возврате фокуса затирал бы правки под руками мастера. */
    refetchOnWindowFocus: false,
  });

  if (organization.isPending || design.isPending) {
    return (
      <div className="flex h-[100dvh] flex-col gap-3 p-4">
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="min-h-0 flex-1 rounded-2xl" />
      </div>
    );
  }

  if (organization.isError || !organization.data || design.isError || !design.data) {
    return (
      <div className="p-4">
        <LoadError
          onRetry={() => {
            void organization.refetch();
            void design.refetch();
          }}
        />
      </div>
    );
  }

  return <StudioScreen org={organization.data} slug={slug} initial={design.data} />;
}
