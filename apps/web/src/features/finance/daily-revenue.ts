/**
 * Доход месяца по дням — полоса под суммой на экране «Финансы».
 *
 * Прототип «Кабинет 2026» кладёт под доход месяца тридцать столбиков: как
 * сложилась сумма — ровно или двумя выходными. Столбики по месяцам на
 * «Месяце» дали бы один столбик, а дни — ответ.
 *
 * Считается из тех же завершённых визитов, что стоят списком ниже: два
 * источника на одном экране разошлись бы на первой отмене.
 */
export interface DayRevenue {
  /** `YYYY-MM-DD` в поясе салона. */
  key: string;
  day: number;
  revenue: number;
  isToday: boolean;
  /** День ещё не наступил: дохода у него быть не может, а не «ноль». */
  isFuture: boolean;
}

export function monthDays(
  today: string,
  rows: ReadonlyArray<{ dateKey: string; amount: number }>,
): DayRevenue[] {
  const [year, month, day] = today.split('-').map(Number);
  /* Нулевой день следующего месяца — последний день этого, високосный
     февраль включительно. */
  const length = new Date(Date.UTC(year!, month!, 0)).getUTCDate();
  const prefix = today.slice(0, 8);

  const sums = new Map<string, number>();
  for (const row of rows) {
    if (row.dateKey.startsWith(prefix)) {
      sums.set(row.dateKey, (sums.get(row.dateKey) ?? 0) + row.amount);
    }
  }

  return Array.from({ length }, (_, index) => {
    const date = index + 1;
    const key = `${prefix}${String(date).padStart(2, '0')}`;
    return {
      key,
      day: date,
      revenue: sums.get(key) ?? 0,
      isToday: date === day,
      isFuture: date > day!,
    };
  });
}
