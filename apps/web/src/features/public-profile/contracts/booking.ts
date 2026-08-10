import type { PublicOrganization } from '../engine/types';
import type { BookingFlow, BookingStep } from '../engine/use-booking-flow';

import type { SheetChrome } from './chrome';

/**
 * Записной контракт «движок ↔ миры» (BRAND_STYLE_ARCHITECTURE.md §7.3).
 * `BookingFlow` — машина состояния записи, одна копия на продукт: её
 * создаёт хук движка `use-booking-flow` (шаг M1), контракт реэкспортирует
 * тип как часть стабильной поверхности.
 */
export type { BookingFlow, BookingStep };

/**
 * Шторка записи мира: хром и сцены поверх готового flow. Мир владеет своей
 * шторкой целиком — сцены шагов (услуги, допродажи, время, успех) остаются
 * его внутренними компонентами; единственное исключение — шаг «Контакты»,
 * общий для всех миров (`shared/booking-contacts-step.tsx`, §7.6).
 *
 * Flow приходит пропсом: его создаёт хук-хост (§7.2) — `useBookingFlow`
 * в секции мира или обёртка `BookingFlowSheet` там, где нужен свежий flow
 * на субъекта (карточка услуги в прайсе).
 */
export interface BookingSheetProps {
  flow: BookingFlow;
  org: PublicOrganization;
  /** Хром мира поверх `shared/sheet-base.tsx` (§7.4). */
  chrome: SheetChrome;
}
