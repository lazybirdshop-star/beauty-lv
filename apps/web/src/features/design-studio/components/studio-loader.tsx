'use client';

import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { getMyOrganization } from '@/features/organization-profile/api';

import { getMyAvatar, getPageDesignState } from '../api';

import { StudioScreen } from './studio-screen';

/**
 * Загрузка режима: организация мастера, состояние её облика и её портрет.
 *
 * Три запроса, а не один: организация уже лежит в кеше кабинета (тот же ключ
 * `my-organization`), состояние Студии — черновик, публикация и история —
 * принадлежит только этому режиму и не должно попадать в каждый экран
 * кабинета, а портрет вообще не относится к облику: это строка самой мастера
 * (`organization_members.avatar_url`), которая живёт мимо черновика и
 * публикации.
 *
 * Состояния честные (§8): скелетон в пропорциях экрана, а не спиннер, и
 * разговорная ошибка вместо кода.
 *
 * `data-surface="dashboard"` ставится здесь, у корня режима: Студия — часть
 * кабинета (UI_GUIDELINES §2.0), и её хром обязан говорить «Дизайн системой
 * AMOLIE», а не прежним миром продукта. Без метки режим оставался единственной
 * поверхностью кабинета на отменённой розовой палитре — ровно то расхождение,
 * которое видно глазом при переходе из кабинета в Студию. Метка одна на все
 * три состояния загрузчика и достаёт до шторок: `globals.css` ищет её через
 * `:root:has(…)`, а шторки уезжают в портал мимо этого поддерева.
 */
export function StudioLoader({ slug, exitHref }: { slug: string; exitHref: string }) {
  const organization = useQuery({ queryKey: ['my-organization'], queryFn: getMyOrganization });
  const design = useQuery({
    queryKey: ['page-design', slug],
    queryFn: () => getPageDesignState(slug),
    /* Черновик — источник истины на сервере, но правит его эта же вкладка:
       перезапрос при возврате фокуса затирал бы правки под руками мастера. */
    refetchOnWindowFocus: false,
  });
  /* Портрет спрашивается отдельно, потому что и живёт отдельно: он не часть
     облика страницы, а строка самой мастера. Свой ключ — чтобы кабинет,
     которому однажды тоже понадобится лицо, читал тот же кеш. */
  const member = useQuery({
    queryKey: ['my-member', slug],
    queryFn: () => getMyAvatar(slug),
    refetchOnWindowFocus: false,
  });

  if (organization.isPending || design.isPending || member.isPending) {
    return (
      <StudioSurface>
        <div className="flex h-[100dvh] flex-col gap-3 p-4">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="min-h-0 flex-1" />
        </div>
      </StudioSurface>
    );
  }

  if (
    organization.isError ||
    !organization.data ||
    design.isError ||
    !design.data ||
    member.isError ||
    !member.data
  ) {
    return (
      <StudioSurface>
        <div className="p-5">
          <LoadError
            onRetry={() => {
              void organization.refetch();
              void design.refetch();
              void member.refetch();
            }}
          />
        </div>
      </StudioSurface>
    );
  }

  return (
    <StudioSurface>
      <StudioScreen
        org={organization.data}
        slug={slug}
        initial={design.data}
        initialAvatar={member.data.avatar}
        exitHref={exitHref}
      />
    </StudioSurface>
  );
}

/** Поле кабинета под режимом — и метка, по которой `globals.css` его узнаёт. */
function StudioSurface({ children }: { children: ReactNode }) {
  return (
    <div data-surface="dashboard" className="min-h-dvh bg-bg">
      {children}
    </div>
  );
}
