import { addDaysToKey, isDateKey, mondayOfKey, type DateKey } from './civil-date';

/** День в сетке месяца. */
export interface GridDay {
  key: DateKey;
  /** Число месяца — то, что напечатано в клетке. */
  day: number;
  /** День соседнего месяца, добивающий неделю до семи клеток. */
  outside: boolean;
}

/**
 * Месяц клетками — шесть недель по семь дней, с понедельника.
 *
 * Шесть недель всегда, а не «сколько выйдет»: сетка переменной высоты
 * дёргает всплывающее окно при переходе между месяцами, и выбор даты
 * начинает прыгать под пальцем. Лишняя неделя занята днями соседних
 * месяцев — они помечены и выбираются как обычные: человек, метящий в
 * первое число следующего месяца, попадает в него.
 *
 * С понедельника — так читают календарь по-русски и по-латышски; у
 * английского кабинета та же сетка, и это сознательное упрощение: два
 * разных начала недели в одном продукте стоят дороже, чем непривычный
 * понедельник в английской версии.
 */
export function monthGrid(anchor: DateKey): GridDay[] {
  if (!isDateKey(anchor)) return [];
  const month = anchor.slice(0, 7);
  const first = `${month}-01`;
  const start = mondayOfKey(first);

  return Array.from({ length: 42 }, (_, index) => {
    const key = addDaysToKey(start, index);
    return { key, day: Number(key.slice(8, 10)), outside: key.slice(0, 7) !== month };
  });
}

/** Соседний месяц в ту же сторону, что нажата стрелка. */
export function shiftMonth(anchor: DateKey, months: number): DateKey {
  if (!isDateKey(anchor)) return anchor;
  const year = Number(anchor.slice(0, 4));
  const month = Number(anchor.slice(5, 7)) - 1 + months;
  const target = new Date(Date.UTC(year, month, 1));
  /* Первое число: 31 января, сдвинутое на месяц, не имеет права стать
     третьим марта. Число дня выбор не хранит — его хранит само значение. */
  return target.toISOString().slice(0, 10);
}
