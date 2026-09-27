const MINUTE = 60_000;

/** Открытое время отрезком — как его отдаёт день главной. */
export interface OpenWindow {
  startsAt: string;
  minutes: number;
  memberId: string;
}

/** Ближайшее окно, которое ещё можно продать. */
export interface NextWindow {
  /** Начало с поправкой на «сейчас» — ISO. */
  startsAt: string;
  endsAt: string;
  /** Сколько минут до начала; 0 — окно уже идёт. */
  inMinutes: number;
  memberId: string;
}

/**
 * Ближайшее окно дня — чтобы «Время» называло время, а не считало окна.
 *
 * Счётчик «открыто 4 окна» ни к чему не ведёт: он верен и в девять утра, и в
 * восемь вечера. Один ответ на вопрос «куда сейчас можно посадить человека»
 * стоит четырёх цифр, и с него начинается действие — запись в это окно.
 *
 * Граница продажи та же, что у календаря (`sellableWindows`): начать визит
 * посреди шага нельзя, поэтому идущее окно подрезается по ближайшему шагу
 * после текущей минуты — а окно, у которого после подрезки ничего не
 * осталось, не предлагается вовсе.
 */
export function nextOpenWindow(
  windows: readonly OpenWindow[],
  nowMs: number,
  slotMinutes = 30,
): NextWindow | null {
  const step = slotMinutes * MINUTE;
  let best: NextWindow | null = null;

  for (const window of windows) {
    const opens = new Date(window.startsAt).getTime();
    const closes = opens + window.minutes * MINUTE;
    if (!Number.isFinite(opens) || window.minutes <= 0) continue;

    /* Шаг считается от начала окна, а не от полуночи: мастер открывает время
       своей сеткой, и 09:15–10:45 шагает четвертями от 09:15. */
    const edge = opens >= nowMs ? opens : opens + Math.ceil((nowMs + MINUTE - opens) / step) * step;
    if (edge >= closes) continue;

    if (best && new Date(best.startsAt).getTime() <= edge) continue;
    best = {
      startsAt: new Date(edge).toISOString(),
      endsAt: new Date(closes).toISOString(),
      inMinutes: Math.max(0, Math.round((edge - nowMs) / MINUTE)),
      memberId: window.memberId,
    };
  }
  return best;
}
