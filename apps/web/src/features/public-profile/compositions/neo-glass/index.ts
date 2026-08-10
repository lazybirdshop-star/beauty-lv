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
 * Мир Neo Glass — третья новая композиция программы (шаг M6, П8): глубина
 * стекла и свет ночного города. Пространственная слоистая композиция —
 * статичный амбайент земли, парящие стеклянные острова, плавающие капсулы
 * действия; непрерывные углы и капсулы вместо прямоугольников; пружинная
 * физика вместо кривой. Объект собран полным (§7.1) — частичных композиций
 * не бывает; слоты статически импортированы, поэтому bundler собирает их в
 * один чанк root-модуля (§8.2). Слоты читают контрактные пропсы напрямую,
 * без адаптеров: разметка спроектирована по §9 и референсам мира, а не
 * унаследована от soft-тернарников.
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
