import type { ComponentType } from 'react';

import type { BookingSheetProps } from './booking';
import type { CalendarSectionProps } from './calendar';
import type { MotionSpec } from './chrome';
import type {
  ContactsSectionProps,
  HeaderProps,
  NavProps,
  ProfileShellProps,
  ServiceListSectionProps,
} from './sections';

/**
 * Корневой контракт мира (BRAND_STYLE_ARCHITECTURE.md §7.1): полный набор
 * слотов композиции. Частичные композиции запрещены типом — мир реализует
 * все слоты, иначе реестр не соберётся. На переходный период миграции
 * недостающие миры заполняются алиасами на soft (§8.3) — это механизм
 * реестра, а не частичность контракта.
 */
export interface BrandStyleComposition {
  /** Каркас страницы: hero, панель, первый кадр. */
  Shell: ComponentType<ProfileShellProps>;
  Header: ComponentType<HeaderProps>;
  Nav: ComponentType<NavProps>;
  CalendarSection: ComponentType<CalendarSectionProps>;
  ServiceListSection: ComponentType<ServiceListSectionProps>;
  ContactsSection: ComponentType<ContactsSectionProps>;
  BookingSheet: ComponentType<BookingSheetProps>;
  /** Хореография мира — данные, не компонент (§10); в основном бандле (§8.2). */
  motion: MotionSpec;
}
