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
 * Мир FUNK — второй мир, пришедший готовым файлом (`brutal.html`).
 *
 * Композиция повторяет структуру файла узел в узел: бегущая строка,
 * вордмарк с надстрочником, портрет цветным блоком, навигация тремя
 * перекошенными блоками, плита ближайшего окна с меткой-стикером,
 * календарь-чертёж, прайс нумерованными позициями, шторка с чернильной
 * полосой вместо ручки.
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
