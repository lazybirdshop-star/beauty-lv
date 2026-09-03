import type { Messages } from '@/lib/i18n';

import type { IconName } from './components/icon';

/**
 * Группа боковой панели.
 *
 * Деление и порядок взяты из макета (`app-design/lib.mjs`, `MASTER_NAV` и
 * `ADMIN_NAV`), а не придуманы заново.
 *
 * У мастера групп две: семь пунктов работы идут подряд без подписи — она
 * знает их наизусть, — а под «Рабочим местом» лежит то, куда заходят раз в
 * месяц. У администратора три, и подписаны все: панель платформы читают
 * редко и разделами, а не наизусть.
 */
export type NavGroup = 'work' | 'workspace' | 'platform' | 'operations' | 'system';

export function navGroupLabels(t: Messages): Record<NavGroup, string> {
  return {
    /* У первой группы кабинета подписи нет: в макете над «Главной» пусто. */
    work: '',
    workspace: t.nav.groupWorkspace,
    platform: t.nav.groupPlatform,
    operations: t.nav.groupOperations,
    system: t.nav.groupSystem,
  };
}

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: IconName;
  group: NavGroup;
  /** Work waiting behind this item, shown as a count. Absent or 0 renders nothing. */
  badgeCount?: number;
  /**
   * Счётчик янтарный, а не розовый: в панели платформы он значит «работа
   * ждёт решения», и розовый акцент продукта здесь читался бы как украшение.
   */
  badgeTone?: 'pink' | 'amber';
  /**
   * One line under the screen's title saying what the section is for.
   *
   * A master arrives knowing her trade, not this product's vocabulary: from
   * the words «Календарь» and «Записи» alone there is no way to tell which
   * one holds her free windows and which one holds other people's requests.
   */
  hint?: string;
  /** Внешний адрес — открывается вне панели (почта поддержки). */
  external?: boolean;
}
