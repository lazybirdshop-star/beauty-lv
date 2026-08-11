'use client';

import { useEffect } from 'react';

import { ZONE_ATTRIBUTE } from '@/features/design-studio/preview-bridge';

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
  sheetOpen,
}: {
  org: PublicOrganization;
  initialSlots: PublishedSlot[];
  /**
   * Контекст холста Студии (DESIGN_STUDIO.md §4.4): шторка записи — экран,
   * который получит клиент, и мастер обязана его проверить. Для публичной
   * страницы проп не задаётся, и шторкой владеет только посетитель.
   */
  sheetOpen?: boolean;
}) {
  const { CalendarSection } = useComposition();
  const calendar = useScheduleCalendar({ org, initialSlots });
  const { setSheetOpen } = calendar.actions;

  useEffect(() => {
    if (sheetOpen !== undefined) setSheetOpen(sheetOpen);
  }, [sheetOpen, setSheetOpen]);

  return (
    /* `display: contents` — обёртка не создаёт бокса, поэтому раскладка мира
       остаётся его собственной, а зона для холста Студии всё же есть. */
    <div style={{ display: 'contents' }} {...{ [ZONE_ATTRIBUTE]: 'buttons' }}>
      <CalendarSection data={calendar.data} state={calendar.state} actions={calendar.actions} />
    </div>
  );
}
