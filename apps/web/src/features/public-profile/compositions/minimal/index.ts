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
 * Мир MINIMAL — третий мир, пришедший готовым файлом (`minimal.html`).
 *
 * Композиция повторяет структуру файла узел в узел: вордмарк с точкой,
 * имя в две строки с приглушённой второй, портрет блоком справа,
 * сегментированная навигация, плита ближайшего окна с синим свечением,
 * календарь кругами, прайс сгруппированным списком, шторка с брусочком.
 *
 * Логика записи целиком наша: календарь читает `useScheduleCalendar`,
 * шторка — `useBookingFlow`, шаг контактов общий на продукт.
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
