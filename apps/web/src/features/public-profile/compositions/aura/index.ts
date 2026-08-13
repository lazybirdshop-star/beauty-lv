import type { BrandStyleComposition } from '../../contracts/composition';

import { BookingCalendar } from './booking-calendar';
import { BookingSheet } from './booking-sheet';
import { ContactsCard } from './contacts-card';
import { motion } from './motion';
import { OrgHeader } from './org-header';
import { OrgNav } from './org-nav';
import { ServiceList } from './service-list';
import { Shell } from './shell';

/**
 * Мир AURA — первый мир, пришедший в продукт **готовым**: автор прислал его
 * одним файлом (`aura.html`), и композиция повторяет структуру этого файла
 * узел в узел — аврора, орб, липкая капсула навигации, плита ближайшего
 * окна, стеклянный календарь, лист прайса, шторка записи с орбом успеха.
 *
 * Что не перенесено буквально — палитра: три её значения не проходили
 * продуктовую норму AA, и светлота опущена до первой проходящей ступени с
 * сохранением тона (причины и измерения — в `theme-aura.ts`).
 *
 * Логика записи при этом целиком наша: календарь читает
 * `useScheduleCalendar`, шторка — `useBookingFlow`, шаг контактов общий на
 * весь продукт. Из файла взята разметка, а не поведение.
 *
 * Объект собран полным (§7.1) — частичных композиций не бывает; слоты
 * статически импортированы, поэтому bundler собирает их в один чанк
 * root-модуля (§8.2).
 */
export const composition: BrandStyleComposition = {
  Shell,
  Header: OrgHeader,
  Nav: OrgNav,
  CalendarSection: BookingCalendar,
  ServiceListSection: ServiceList,
  ContactsSection: ContactsCard,
  BookingSheet,
  motion,
};
