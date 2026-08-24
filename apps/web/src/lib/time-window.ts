import { addDaysToKey, civilToInstant, FALLBACK_TIMEZONE, type DateKey } from '@/lib/civil-date';
import { dayKey } from '@/lib/format';

/**
 * Отрезок времени, за который экран спрашивает список.
 *
 * Оба конца необязательны: главная спрашивает одни сутки, календарь — «от
 * начала показанной недели и дальше», архив записей — всё. Пустое окно означает
 * «всё», и старый вызов без аргументов продолжает значить ровно то же, что и
 * значил.
 */
export interface TimeWindow {
  from?: Date;
  to?: Date;
}

/**
 * Окно — в строку запроса. Пустое окно не оставляет от адреса ничего.
 *
 * Границы уезжают на сервер полными метками времени (`toISOString`), а не
 * датами. Это не мелочь оформления: сутки мастера — это сутки её салона, и
 * единственная сторона, знающая пояс организации, — кабинет. Сервер получает
 * посчитанный момент и не имеет своего мнения о том, когда начинается день;
 * ровно за отсутствие этого правила сводка API считала «сегодня» по часам UTC.
 */
export function timeWindowQuery(window: TimeWindow): string {
  const params = new URLSearchParams();
  if (window.from) params.set('from', window.from.toISOString());
  if (window.to) params.set('to', window.to.toISOString());
  const query = params.toString();
  return query ? `?${query}` : '';
}

/**
 * Полночь гражданского дня в поясе организации.
 *
 * Пояс необязателен — той же договорённостью, что и во всём `civil-date`:
 * контекст кабинета отдаёт его как `string | undefined`, и заставлять каждый
 * экран разворачивать это самому значило бы получить пять разных запасных
 * вариантов вместо одного.
 */
function midnightOf(key: DateKey, timeZone?: string): Date {
  return civilToInstant(key, 0, timeZone ?? FALLBACK_TIMEZONE);
}

/**
 * Сутки, в которые попадает `at`, по часам названного пояса.
 *
 * Считается гражданским календарём из `civil-date`, а не арифметикой над
 * меткой времени: смещение пояса непостоянно, и «минус три часа от UTC» — не
 * то же самое, что «полночь в Риге». Своей реализации здесь намеренно нет —
 * два разных способа считать одну полночь однажды разошлись бы в час перевода
 * стрелок, и разошлись бы молча.
 *
 * Границы — полуинтервал `[from, to)`: смежные сутки не могут ни поделить одну
 * запись, ни потерять её.
 */
export function dayWindow(at: Date, timeZone?: string): TimeWindow {
  const key = dayKey(at, timeZone);
  return {
    from: midnightOf(key, timeZone),
    to: midnightOf(addDaysToKey(key, 1), timeZone),
  };
}

/**
 * «От этого дня и дальше» — окно без верхней границы.
 *
 * Верхней границы нет намеренно. Растёт у списков всегда прошлое: будущее
 * ограничено тем, насколько вперёд мастер вообще опубликовала окна, а вот
 * позади за три года работы накапливается всё. Отсечь прошлое достаточно,
 * чтобы список перестал расти без предела.
 */
export function fromDayWindow(key: DateKey, timeZone?: string): TimeWindow {
  return { from: midnightOf(key, timeZone) };
}
