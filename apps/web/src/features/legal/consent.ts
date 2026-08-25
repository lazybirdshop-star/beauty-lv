/**
 * Запись о выборе посетителя относительно хранения в его устройстве.
 *
 * Логика отделена от React намеренно: её читает и сервер (чтобы решить,
 * рисовать ли баннер, ещё до гидратации — иначе полоса мигает на каждой
 * загрузке), и клиент (когда посетитель ответил). Общий разбор строки —
 * единственный способ гарантировать, что обе стороны поймут куку одинаково.
 */
import {
  ALWAYS_ON,
  STORAGE_CATEGORIES,
  optionalCategories,
  type StorageCategory,
} from './storage-inventory';

/** Имя куки. Сама она строго необходимая: без неё нельзя помнить отказ. */
export const CONSENT_COOKIE = 'amolie_storage_consent';

/**
 * Полгода — потолок, а не срок хранения ради удобства.
 *
 * EDPB и национальные регуляторы исходят из того, что согласие не бывает
 * бессрочным: через полгода посетителя спрашивают заново. Отказ живёт ровно
 * столько же — иначе «нет» пришлось бы повторять на каждом заходе, и отказ
 * стал бы дороже согласия, чего статья 7(3) GDPR не допускает.
 */
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

/**
 * Версия формата. Растёт, когда меняется смысл поля, а не его значение:
 * старая кука тогда считается непрочитанной, и вопрос задаётся заново.
 */
const CONSENT_VERSION = 1;

export interface ConsentRecord {
  readonly version: number;
  /** Момент выбора — доказательство согласия (ст. 7(1) GDPR). */
  readonly decidedAt: string;
  /**
   * О чём спрашивали. Без этого поля нельзя отличить «отказался от аналитики»
   * от «про аналитику речи ещё не шло»: в обоих случаях `granted` пуст, а
   * спрашивать заново нужно только во втором.
   */
  readonly asked: readonly StorageCategory[];
  /** Категории сверх строго необходимых, на которые посетитель согласился. */
  readonly granted: readonly StorageCategory[];
}

/** Отсортировать по порядку объявления, чтобы сравнение не зависело от ввода. */
function ordered(categories: readonly StorageCategory[]): StorageCategory[] {
  return STORAGE_CATEGORIES.filter(
    (category) => !ALWAYS_ON.includes(category) && categories.includes(category),
  );
}

export function createConsent(
  granted: readonly StorageCategory[],
  asked: readonly StorageCategory[] = optionalCategories(),
): ConsentRecord {
  const askedSet = ordered(asked);

  return {
    version: CONSENT_VERSION,
    decidedAt: new Date().toISOString(),
    asked: askedSet,
    // Согласиться можно только на то, о чём спросили.
    granted: ordered(granted).filter((category) => askedSet.includes(category)),
  };
}

export function serializeConsent(record: ConsentRecord): string {
  return JSON.stringify({
    v: record.version,
    t: record.decidedAt,
    a: record.asked,
    g: record.granted,
  });
}

/**
 * Разбор куки. Любая неожиданность — это `null`, то есть «выбора не было»:
 * повреждённая запись не должна молча сойти за согласие.
 */
export function parseConsent(raw: string | null | undefined): ConsentRecord | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const { v, t, a, g } = parsed as { v?: unknown; t?: unknown; a?: unknown; g?: unknown };
    if (v !== CONSENT_VERSION) return null;
    if (typeof t !== 'string' || Number.isNaN(Date.parse(t))) return null;
    if (!Array.isArray(a) || !Array.isArray(g)) return null;

    const known = (list: unknown[]): StorageCategory[] =>
      ordered(
        list.filter((item): item is StorageCategory =>
          STORAGE_CATEGORIES.includes(item as StorageCategory),
        ),
      );

    const asked = known(a);
    return { version: v, decidedAt: t, asked, granted: known(g).filter((c) => asked.includes(c)) };
  } catch {
    return null;
  }
}

/**
 * Нужно ли спрашивать.
 *
 * Спрашиваем, если выбора не было, если он протух или если с тех пор в описи
 * появилась категория, о которой посетителя не спрашивали. Последнее важнее
 * первых двух: молчаливое расширение прежнего согласия на новый счётчик —
 * ровно то, за что штрафуют.
 *
 * Когда спрашивать не о чем — в устройстве лежит только строго необходимое —
 * согласие не требуется вовсе (ст. 5(3) Директивы 2002/58/EC), и баннер
 * остаётся уведомлением, которое достаточно показать один раз.
 */
export function needsDecision(
  record: ConsentRecord | null,
  now: Date = new Date(),
  optional: readonly StorageCategory[] = optionalCategories(),
): boolean {
  if (record === null) return true;

  const age = (now.getTime() - Date.parse(record.decidedAt)) / 1000;
  if (age > CONSENT_MAX_AGE_SECONDS) return true;

  return ordered(optional).some((category) => !record.asked.includes(category));
}

/** Разрешена ли категория к использованию прямо сейчас. */
export function isAllowed(record: ConsentRecord | null, category: StorageCategory): boolean {
  if (ALWAYS_ON.includes(category)) return true;
  return record?.granted.includes(category) ?? false;
}
