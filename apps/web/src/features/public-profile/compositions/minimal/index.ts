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
 * Мир Minimal — первая новая композиция программы (шаг M3, П5): «воздух и
 * порядок» по BRAND_STYLES.md §6. Объект собран полным (§7.1) — частичных
 * композиций не бывает; слоты статически импортированы, поэтому bundler
 * собирает их в один чанк root-модуля (§8.2). Слоты читают контрактные
 * пропсы напрямую, без адаптеров: разметка этого мира спроектирована заново,
 * а не унаследована от soft-тернарников.
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
