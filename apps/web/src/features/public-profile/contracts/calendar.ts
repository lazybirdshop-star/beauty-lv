import type {
  ScheduleCalendarActions,
  ScheduleCalendarData,
  ScheduleCalendarState,
  ScheduleFacts,
} from '../engine/use-schedule-calendar';

/**
 * Календарный контракт «движок ↔ миры» (BRAND_STYLE_ARCHITECTURE.md §7.2).
 * Структуры — те, что возвращает `engine/use-schedule-calendar` (шаг M1);
 * контракт даёт им канонические имена, чтобы композиции зависели от
 * стабильной поверхности, а не от внутренностей движка.
 */
export type CalendarData = ScheduleCalendarData;
export type CalendarState = ScheduleCalendarState;
export type CalendarActions = ScheduleCalendarActions;
export type { ScheduleFacts };

/**
 * Секция календаря мира: факты + сетка дат + слоты + CTA. Состояние и
 * действия создаёт хост (`registry/calendar-host.tsx`) через хук движка —
 * композиция получает готовые проекции и не трогает выборки сама.
 * Шторку записи рендерит сама секция мира; flow она получает через
 * хук-хост (§7.2–§7.3).
 */
export interface CalendarSectionProps {
  data: CalendarData;
  state: CalendarState;
  actions: CalendarActions;
}
