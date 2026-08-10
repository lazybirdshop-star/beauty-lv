import { redirect } from 'next/navigation';

import { serverApiFetch } from '@/lib/server-api';

export interface OrganizationMe {
  slug: string;
  name: string;
}

/**
 * The fine-grained "is this the right organization for this user" check
 * middleware.ts can't do at the edge (dashboard-architecture plan §2) —
 * middleware only verifies there's a valid master/admin token at all.
 *
 * Живёт отдельно от layout кабинета, потому что охраняемых входов стало два:
 * сам кабинет и режим Студии, у которого свой хром (DESIGN_STUDIO.md §1 —
 * экран отдаётся странице целиком). Проверка одна на оба: второй экземпляр
 * правила доступа рано или поздно разошёлся бы с первым.
 */
export async function requireOrganization(slug: string): Promise<OrganizationMe> {
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
}
