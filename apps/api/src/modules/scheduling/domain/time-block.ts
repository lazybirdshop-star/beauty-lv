import { DASHBOARD_ERROR_CODES } from '@amolie/shared-kernel';

/**
 * Заблокированное время — полуинтервал `[startsAt, endsAt)` одного человека.
 *
 * Правый край исключён, как у визита: обед до 14:00 освобождает 14:00, и окно
 * ровно в 14:00 открыть можно.
 */
export interface BlockInterval {
  id: string;
  organizationMemberId: string;
  startsAt: Date;
  endsAt: Date;
}

/** Больше месяца подряд — это не блок, а уход из салона; для него есть отстранение. */
export const MAX_BLOCK_MINUTES = 31 * 24 * 60;
/** Повтор — неделями, и не дальше квартала: дальше расписание всё равно поменяется. */
export const MAX_REPEAT_WEEKS = 12;

/** Блок, внутри которого лежит момент. Начало включено, конец — нет. */
export function blockAt(
  blocks: BlockInterval[],
  organizationMemberId: string,
  moment: Date,
): BlockInterval | null {
  const time = moment.getTime();
  return (
    blocks.find(
      (block) =>
        block.organizationMemberId === organizationMemberId &&
        block.startsAt.getTime() <= time &&
        time < block.endsAt.getTime(),
    ) ?? null
  );
}

/** Блок, с которым пересекается отрезок `[startsAt, endsAt)`. */
export function overlappingBlock(
  blocks: BlockInterval[],
  organizationMemberId: string,
  startsAt: Date,
  endsAt: Date,
): BlockInterval | null {
  return (
    blocks.find(
      (block) =>
        block.organizationMemberId === organizationMemberId &&
        block.startsAt.getTime() < endsAt.getTime() &&
        startsAt.getTime() < block.endsAt.getTime(),
    ) ?? null
  );
}

/** Стеночные часы момента в поясе заведения, собранные как «будто UTC». */
function wallClock(moment: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(moment);
  const part = (type: string) => Number(parts.find((item) => item.type === type)!.value);
  return Date.UTC(
    part('year'),
    part('month') - 1,
    part('day'),
    part('hour'),
    part('minute'),
    part('second'),
  );
}

/**
 * Тот же час через N гражданских дней — в поясе заведения, а не плюс N×24 часа.
 *
 * «Обед каждый четверг в 13:00» обязан остаться в 13:00 и в неделю перевода
 * часов: семь суток по двадцать четыре часа унесли бы его на 12:00 или 14:00,
 * и мастер обнаружила бы это, когда клиент встанет ровно на её обед.
 */
export function addCivilDays(moment: Date, days: number, timeZone: string): Date {
  const wall = wallClock(moment, timeZone) + days * 24 * 60 * 60_000;
  const offset = (at: number) => wallClock(new Date(at), timeZone) - at;
  const firstPass = wall - offset(wall);
  return new Date(wall - offset(firstPass));
}

/** Повторы блока по неделям — первый и есть сам блок. */
export function weeklyOccurrences(
  block: { startsAt: Date; endsAt: Date },
  weeks: number,
  timeZone: string,
): { startsAt: Date; endsAt: Date }[] {
  return Array.from({ length: Math.max(1, weeks) }, (_, week) => ({
    startsAt: addCivilDays(block.startsAt, week * 7, timeZone),
    endsAt: addCivilDays(block.endsAt, week * 7, timeZone),
  }));
}

/**
 * Окно попало внутрь заблокированного времени.
 *
 * Отдельно от «внутри визита»: там занято клиентом, здесь мастер сама сказала,
 * что её нет. Конец блока едет вместе с кодом — экран говорит «время
 * заблокировано до 14:00», а не просто «нельзя».
 */
export class SlotInsideBlockError extends Error {
  readonly code = DASHBOARD_ERROR_CODES.slotInsideBlock;

  constructor(readonly blockEndsAt: Date) {
    super('В это время мастер недоступна — время заблокировано');
  }
}
