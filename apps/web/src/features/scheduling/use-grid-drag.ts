'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import type { CalendarEntry } from './calendar-columns';
import { HOUR } from './calendar-model';
import {
  DRAG_SLOP_PX,
  MOVE_STEP,
  SELECT_STEP,
  clamp,
  columnIndexAt,
  minutesAtOffset,
  rangeBetween,
  type MinuteRange,
} from './grid-geometry';

/** Что сейчас тянут: выделяемый отрезок или визит. */
export type GridDrag =
  | { kind: 'select'; columnIndex: number; range: MinuteRange }
  | { kind: 'move'; entry: CalendarEntry; columnIndex: number; at: number };

type Pending =
  | { kind: 'select'; x: number; y: number; columnIndex: number; origin: number }
  | { kind: 'move'; x: number; y: number; columnIndex: number; entry: CalendarEntry; grab: number };

export interface GridDragOptions {
  /** Выключено на телефоне и там, где действовать нельзя. */
  enabled: boolean;
  /** Границы шкалы в минутах дня. */
  start: number;
  end: number;
  /** Высота часа текущего регистра — та же, что рисует сетка. */
  hourPx?: number;
  columnRects: () => DOMRect[];
  scroller: () => HTMLElement | null;
  canMove: (entry: CalendarEntry) => boolean;
  canDropInto: (entry: CalendarEntry, columnIndex: number) => boolean;
  onSelect: (columnIndex: number, range: MinuteRange, rect: DOMRect) => void;
  onMove: (entry: CalendarEntry, columnIndex: number, at: number) => void;
}

/** У края прокручиваемой сетки она едет сама: иначе визит не дотянуть до вечера. */
const EDGE_PX = 48;
const EDGE_SCROLL_PX = 12;

function pointerMinutes(
  options: GridDragOptions,
  clientY: number,
  columnIndex: number,
  step: number,
): number {
  const rect = options.columnRects()[columnIndex];
  return rect
    ? minutesAtOffset(clientY - rect.top, options.start, step, options.hourPx ?? HOUR)
    : options.start;
}

function scrollAtEdge(scroller: HTMLElement | null, clientY: number) {
  if (!scroller) return;
  const rect = scroller.getBoundingClientRect();
  if (clientY < rect.top + EDGE_PX) scroller.scrollTop -= EDGE_SCROLL_PX;
  else if (clientY > rect.bottom - EDGE_PX) scroller.scrollTop += EDGE_SCROLL_PX;
}

/**
 * Протяжка по сетке — выделение отрезка и перенос визита (спецификация §19, §23).
 *
 * Только мышь и перо. На телефоне то же движение пальца — прокрутка дня, и
 * перехватить его значило бы сделать календарь неприкручиваемым; там у обоих
 * действий есть путь нажатием — меню пустого места и перенос в карточке визита.
 *
 * Нажатие остаётся нажатием: пока указатель не проехал несколько пикселей,
 * ничего не начинается, и обычный щелчок доходит до кнопки клетки или визита.
 * После настоящей протяжки щелчок, который браузер пришлёт следом, гасится —
 * иначе отпущенный над визитом отрезок ещё и открывал бы его карточку.
 */
export function useGridDrag(options: GridDragOptions) {
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });

  const pending = useRef<Pending | null>(null);
  const active = useRef<GridDrag | null>(null);
  const suppressClick = useRef(false);
  const [drag, setDrag] = useState<GridDrag | null>(null);

  useEffect(() => {
    const update = (next: GridDrag | null) => {
      active.current = next;
      setDrag(next);
    };

    const onPointerMove = (event: PointerEvent) => {
      const state = pending.current;
      if (!state) return;
      const current = latest.current;
      if (
        !active.current &&
        Math.hypot(event.clientX - state.x, event.clientY - state.y) < DRAG_SLOP_PX
      ) {
        return;
      }
      scrollAtEdge(current.scroller(), event.clientY);

      if (state.kind === 'select') {
        const at = clamp(
          pointerMinutes(current, event.clientY, state.columnIndex, SELECT_STEP),
          current.start,
          current.end,
        );
        update({
          kind: 'select',
          columnIndex: state.columnIndex,
          range: rangeBetween(state.origin, at),
        });
        return;
      }

      const hovered = columnIndexAt(event.clientX, current.columnRects());
      const columnIndex =
        hovered !== -1 && current.canDropInto(state.entry, hovered) ? hovered : state.columnIndex;
      const at = clamp(
        pointerMinutes(current, event.clientY, columnIndex, MOVE_STEP) - state.grab,
        current.start,
        current.end - state.entry.minutes,
      );
      update({ kind: 'move', entry: state.entry, columnIndex, at });
    };

    const finish = () => {
      const state = pending.current;
      const result = active.current;
      pending.current = null;
      if (!state || !result) return;
      update(null);
      /* Щелчок после протяжки приходит в том же обходе событий; гасим ровно
         его, а не следующий настоящий. */
      suppressClick.current = true;
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 0);

      const current = latest.current;
      if (result.kind === 'select') {
        const rect = current.columnRects()[result.columnIndex];
        if (!rect) return;
        const hourPx = current.hourPx ?? HOUR;
        const top = rect.top + ((result.range.from - current.start) / 60) * hourPx;
        const height = ((result.range.to - result.range.from) / 60) * hourPx;
        current.onSelect(
          result.columnIndex,
          result.range,
          new DOMRect(rect.left, top, rect.width, height),
        );
        return;
      }
      if (result.at !== result.entry.at || result.columnIndex !== state.columnIndex) {
        current.onMove(result.entry, result.columnIndex, result.at);
      }
    };

    const abandon = () => {
      pending.current = null;
      if (active.current) update(null);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && pending.current) abandon();
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', abandon);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', abandon);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const startSelect = useCallback((event: ReactPointerEvent, columnIndex: number) => {
    const current = latest.current;
    if (!current.enabled || event.button !== 0 || event.pointerType === 'touch') return;
    pending.current = {
      kind: 'select',
      x: event.clientX,
      y: event.clientY,
      columnIndex,
      origin: clamp(
        pointerMinutes(current, event.clientY, columnIndex, SELECT_STEP),
        current.start,
        current.end,
      ),
    };
  }, []);

  const startMove = useCallback(
    (event: ReactPointerEvent, entry: CalendarEntry, columnIndex: number) => {
      const current = latest.current;
      if (!current.enabled || event.button !== 0 || event.pointerType === 'touch') return;
      /* Визит поверх колонки: без этого нажатие начало бы и выделение под ним. */
      event.stopPropagation();
      if (!current.canMove(entry)) return;
      pending.current = {
        kind: 'move',
        x: event.clientX,
        y: event.clientY,
        columnIndex,
        entry,
        grab: pointerMinutes(current, event.clientY, columnIndex, MOVE_STEP) - entry.at,
      };
    },
    [],
  );

  /** Был ли этот щелчок хвостом протяжки — тогда его обрабатывать не надо. */
  const consumeClick = useCallback(() => {
    const swallowed = suppressClick.current;
    suppressClick.current = false;
    return swallowed;
  }, []);

  return { drag, startSelect, startMove, consumeClick };
}
