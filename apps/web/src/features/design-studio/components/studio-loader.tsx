'use client';

import { useQuery } from '@tanstack/react-query';

import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { getMyOrganization } from '@/features/organization-profile/api';

import { StudioScreen } from './studio-screen';

/**
 * Загрузка режима: тот же запрос и тот же ключ кеша, что у вкладки
 * оформления, — вход в Студию из кабинета не стоит лишнего запроса.
 *
 * Состояния честные (§8): скелетон в пропорциях экрана, а не спиннер, и
 * разговорная ошибка вместо кода.
 */
export function StudioLoader({ slug }: { slug: string }) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['my-organization'],
    queryFn: getMyOrganization,
  });

  if (isPending) {
    return (
      <div className="flex h-[100dvh] flex-col gap-3 p-4">
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="min-h-0 flex-1 rounded-2xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-4">
        <LoadError onRetry={() => void refetch()} />
      </div>
    );
  }

  return <StudioScreen org={data} slug={slug} />;
}
