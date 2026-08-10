'use client';

import { useScheduleCalendar } from '../engine/use-schedule-calendar';
import type { PublicOrganization, PublishedSlot } from '../engine/types';

import { useComposition } from './composition-context';

/**
 * Хост страницы-календаря (§8.2): состояние расписания создаёт хук движка,
 * мир получает готовые `data`/`state`/`actions` по контракту §7.2.
 */
export function CalendarHost({
  org,
  initialSlots,
}: {
  org: PublicOrganization;
  initialSlots: PublishedSlot[];
}) {
  const { CalendarSection } = useComposition();
  const calendar = useScheduleCalendar({ org, initialSlots });
  return <CalendarSection data={calendar.data} state={calendar.state} actions={calendar.actions} />;
}
