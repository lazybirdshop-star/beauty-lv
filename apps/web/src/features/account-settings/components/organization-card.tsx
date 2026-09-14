'use client';

/**
 * «Заведение» в настройках — прототип «Кабинет 2026»: как называется и как
 * устроено.
 *
 * Только то, что продукт знает наверняка: название, адрес страницы и одна ли
 * мастер работает или салон с командой. Тарифа и валюты здесь нет, пока их
 * нет в продукте: строка «Тариф» без тарифа была бы обещанием.
 */
import { useQuery } from '@tanstack/react-query';

import { Card, CardHeader, CardHint, CardTitle } from '@/components/ui/card';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import type { Workspace } from '@/features/dashboard-shell/workspace-context';
import { getMyOrganization } from '@/features/organization-profile/api';
import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

export function OrganizationCard({ workspace }: { workspace: Workspace }) {
  const t = useT();
  const query = useQuery({ queryKey: ['my-organization'], queryFn: getMyOrganization });

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t.settings.orgTitle}</CardTitle>
          <CardHint>{t.settings.orgHint}</CardHint>
        </div>
      </CardHeader>

      {query.isError ? (
        <LoadError onRetry={() => void query.refetch()} />
      ) : query.isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <dl className="kv-list">
          <dt>{t.settings.orgName}</dt>
          <dd>{query.data.name}</dd>
          <dt>{t.settings.orgType}</dt>
          <dd>
            {workspace.capabilities.hasTeam
              ? fmt(t.settings.orgSalon, { count: workspace.teamSize })
              : t.settings.orgSolo}
          </dd>
          <dt>{t.settings.orgAddress}</dt>
          <dd className="tnum">/{query.data.slug}</dd>
        </dl>
      )}
    </Card>
  );
}
