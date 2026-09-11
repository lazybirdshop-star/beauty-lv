import type { OrgRole } from '@amolie/shared-kernel';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import { serverApiFetch } from '@/lib/server-api';

export interface OrganizationMe {
  role: OrgRole;
  slug: string;
  name: string;
  /**
   * Пояс, в котором у организации идут сутки (`organizations.timezone`,
   * по умолчанию `Europe/Riga`). Всё, что решает «сегодня это или нет»,
   * обязано считать по нему, а не по поясу процесса: сервер живёт в UTC.
   */
  timezone: string;
  /** Место вошедшей в организации — чьё «моё» в календаре и записях. */
  memberId: string;
  /** Соло-мастер или салон — выбрано при регистрации; у соло команды нет. */
  type: 'solo' | 'salon';
  /**
   * Сколько человек сейчас работает. По нему внутри салона раскрываются
   * командный день и ресепшен — они появляются со вторым человеком.
   */
  teamSize: number;
}

export { FALLBACK_TIMEZONE } from '@/lib/civil-date';

/**
 * The fine-grained "is this the right organization for this user" check
 * proxy.ts can't do at the edge (dashboard-architecture plan §2) — the edge
 * gate only verifies there's a valid master/admin token at all.
 *
 * Живёт отдельно от layout кабинета, потому что охраняемых входов стало два:
 * сам кабинет и режим Студии, у которого свой хром (DESIGN_STUDIO.md §1 —
 * экран отдаётся странице целиком). Проверка одна на оба: второй экземпляр
 * правила доступа рано или поздно разошёлся бы с первым.
 *
 * Обёрнута в `cache()`: layout кабинета и страница внутри него спрашивают одно
 * и то же в одном проходе рендера, и без мемоизации это два одинаковых запроса
 * к API вместо одного (`serverApiFetch` ходит с `cache: 'no-store'`, поэтому
 * сам ничего не склеит).
 */
export const requireOrganization = cache(async (slug: string): Promise<OrganizationMe> => {
  let organization: OrganizationMe;
  try {
    organization = await serverApiFetch<OrganizationMe>('/organizations/me');
  } catch {
    redirect('/login');
  }

  if (organization.slug !== slug) {
    redirect(`/${organization.slug}/dashboard`);
  }

  return organization;
});
