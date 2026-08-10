import { createElement } from 'react';

import type { BrandStyleComposition } from '../../contracts/composition';
import type { NavProps } from '../../contracts/sections';
import { BookingCalendar } from './booking-calendar';
import { BookingSheet } from './booking-sheet';
import { ContactsCard } from './contacts-card';
import { motion } from './motion';
import { OrgHeader } from './org-header';
import { OrgNav } from './org-nav';
import { ServiceList } from './service-list';
import { Shell } from './shell';

/**
 * Плакатный мир — эталонный: его вид утверждён и не пересматривается
 * (§15.6). Объект композиции собирается полным (§7.1); слоты статически
 * импортированы, поэтому bundler собирает их в один чанк root-модуля (§8.2).
 *
 * Слот `Nav` — адаптер: существующий `OrgNav` принимает плоские пропсы.
 */
function Nav({ org }: NavProps) {
  // createElement вместо JSX: точка входа мира остаётся .ts по §8.2.
  return createElement(OrgNav, {
    slug: org.slug,
    showPrices: org.showPricesSection,
    showContacts: org.showContactsSection,
    design: org.designPresetKey,
  });
}

export const composition: BrandStyleComposition = {
  Shell,
  Header: OrgHeader,
  Nav,
  CalendarSection: BookingCalendar,
  ServiceListSection: ServiceList,
  ContactsSection: ContactsCard,
  BookingSheet,
  motion,
};
