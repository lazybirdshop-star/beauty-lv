import type { ComponentType } from 'react';

/**
 * Хром шторки мира (BRAND_STYLE_ARCHITECTURE.md §7.4): внешний вид и движение
 * панели. Поведение диалога — портал, фокус-ловушка, ESC, скролл-лок,
 * `aria-describedby`, кап высоты, подвал вне скролла — живёт в
 * `shared/sheet-base.tsx` и миру не принадлежит: сломать доступность шторки
 * через этот объект невозможно, он описывает только то, как она выглядит.
 */
export interface SheetChrome {
  /**
   * Полный набор классов панели: радиусы, край, фон, тень, геометрия мира.
   * Сюда же входит позиционирование (нижняя кромка, кап ширины) — оно часть
   * силуэта мира.
   */
  panelClassName: string;
  /**
   * Ручка рисуется миром; `null` — верхний край несёт шов (FUNK).
   * `shared/sheet-base.tsx` экспортирует `DefaultSheetHandle` — токенный
   * брусок `--handle-*`, которым пользуются оба эталонных мира.
   */
  Handle: ComponentType | null;
  /** Закрытие мира; по умолчанию — общая кнопка X (`DefaultSheetCloseButton`). */
  CloseButton?: ComponentType;
  /**
   * Классы входа/выхода панели. Оба присутствуют на панели постоянно; какой
   * из них играет, решает `[data-state]` Radix внутри CSS мира — тем же
   * механизмом, что `.sheet-panel[data-state='open'|'closed']` в globals.css.
   * Пустая строка у эталонных миров: их анимация токенизирована
   * (`--anim-sheet-in/out`) и класс уже входит в `panelClassName`.
   */
  panelInClass: string;
  panelOutClass: string;
  /** Класс гасящего оверлея; по умолчанию — продуктовый `sheet-overlay`. */
  overlayClassName?: string;
}

/**
 * Хореография мира как данные (§10): едет в основном бандле с объектом
 * композиции, лениво не грузится (§8.2). `ShapeSpec` осознанно отсутствует:
 * удалён правкой П0 — у декларативного описания формы нет
 * runtime-потребителя, геометрия живёт в разметке мира (§11).
 */
export interface MotionSpec {
  /**
   * Имена keyframes входа/выхода шторки (не классы): мир сообщает, чем он
   * анимирует панель. Потребители — общие хелперы (reduced-motion,
   * миниатюры Студии); действующие классы на панели — поля SheetChrome.
   */
  sheetInClass: string;
  sheetOutClass: string;
  /** Переход шага записи/месяца календаря (§10): характер смены сцен. */
  stepTransition: 'crossfade' | 'wipe' | 'spatial' | 'fade' | 'none';
  /** Конфиги для motion/react там, где мир говорит пружинами. */
  springs?: {
    sheet: { type: 'spring'; stiffness: number; damping: number; mass?: number };
    press: { scale: number; duration?: number };
    reveal: { y?: number; opacity?: number; blur?: number; stagger?: number };
  };
}
