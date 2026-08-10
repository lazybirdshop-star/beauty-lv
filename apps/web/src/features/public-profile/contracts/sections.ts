import type { ReactNode } from 'react';

import type { PublicOrganization } from '../engine/types';

/**
 * Секционные пропсы миров (BRAND_STYLE_ARCHITECTURE.md §5, §7.1). Все секции
 * читают доменную организацию целиком: что из неё показывать и как — решает
 * разметка мира. Данные приходят готовыми; секции не ходят в API и не
 * считают доступность (запрет закреплён линтером, §3).
 */

/** Каркас страницы: hero, панель, первый кадр мира; внутри панели — страницы сегмента. */
export interface ProfileShellProps {
  org: PublicOrganization;
  children: ReactNode;
}

/** Hero: имя, фото, действия, медиа-обработка. */
export interface HeaderProps {
  org: PublicOrganization;
}

/** Навигация разделов мира. */
export interface NavProps {
  org: PublicOrganization;
}

/** Прайс: группы, карточки, детальный лист. */
export interface ServiceListSectionProps {
  org: PublicOrganization;
}

/** Контакты. */
export interface ContactsSectionProps {
  org: PublicOrganization;
}
