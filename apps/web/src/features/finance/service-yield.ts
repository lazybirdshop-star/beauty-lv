/** Услуга в составе завершённого визита — её деньги и её минуты. */
export interface ServiceItem {
  name: string;
  /** Минорные единицы, как везде в деньгах. */
  revenue: number;
  minutes: number;
}

/** Услуга и цена её часа кресла. */
export interface ServiceRate extends ServiceItem {
  /** Сколько раз услуга встретилась в завершённых визитах. */
  visits: number;
  /** Минорные единицы за час занятого кресла. */
  perHour: number;
}

/** Вердикт по услугам: кто держит время дорого, а кто дёшево. */
export interface RateVerdict {
  best: ServiceRate;
  worst: ServiceRate;
  /** На сколько процентов дешевле худшая — целыми. */
  gapPercent: number;
}

/**
 * Меньше трёх визитов — не услуга, а случай: одна дорогая стрижка выводила
 * бы услугу в лидеры и советовала бы на ней сосредоточиться.
 */
const MIN_VISITS = 3;
/** Разница меньше пятой не стоит слов: на таком разбросе совет вредит. */
const MIN_GAP = 20;

/**
 * Цена часа кресла по услугам — от суммы к решению.
 *
 * Деньги по услугам отвечают «что покупают», а не «что выгодно держать в
 * расписании»: окрашивание за 60 € в три часа приносит меньше, чем две
 * стрижки за 25 € в час. Одна мера — деньги, делённые на занятые минуты, —
 * ставит их в один ряд.
 */
export function serviceRates(items: readonly ServiceItem[]): ServiceRate[] {
  const byName = new Map<string, ServiceRate>();
  for (const item of items) {
    const name = item.name.trim();
    if (!name || item.minutes <= 0) continue;
    const row = byName.get(name);
    if (row) {
      row.revenue += item.revenue;
      row.minutes += item.minutes;
      row.visits += 1;
    } else {
      byName.set(name, {
        name,
        revenue: item.revenue,
        minutes: item.minutes,
        visits: 1,
        perHour: 0,
      });
    }
  }
  return [...byName.values()]
    .map((row) => ({ ...row, perHour: Math.round(row.revenue / (row.minutes / 60)) }))
    .sort((a, b) => b.perHour - a.perHour);
}

/**
 * Что из этого сказать вслух — или промолчать.
 *
 * Экран финансов становится советом только там, где совет обоснован:
 * услугами, которые повторялись, и разницей, которую видно. Во всех прочих
 * случаях вердикта нет — цифры остаются цифрами, и это честнее выдуманного
 * вывода.
 */
export function rateVerdict(
  rates: readonly ServiceRate[],
  options: { minVisits?: number; minGap?: number } = {},
): RateVerdict | null {
  const minVisits = options.minVisits ?? MIN_VISITS;
  const minGap = options.minGap ?? MIN_GAP;
  const solid = rates.filter((row) => row.visits >= minVisits && row.perHour > 0);
  if (solid.length < 2) return null;

  const best = solid[0]!;
  const worst = solid[solid.length - 1]!;
  const gapPercent = Math.round(((best.perHour - worst.perHour) / best.perHour) * 100);
  if (gapPercent < minGap) return null;
  return { best, worst, gapPercent };
}
