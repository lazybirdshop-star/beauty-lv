import type { RegistrationMode } from '@amolie/shared-kernel';

import type { Locale } from '@/lib/i18n/config';
import type { Messages } from '@/lib/i18n/messages';

export type LandingCopy = Messages['marketing'];

/*
 * Каждый ключ заявочного режима обязан переписывать ключ лендинга. Лишний
 * ключ молча ничего бы не менял — и кнопка осталась бы «Присоединиться» там,
 * где за ней форма заявки.
 */
type StrayWaitlistKeys = Exclude<keyof Messages['marketingWaitlist'], keyof LandingCopy>;
const noStrayWaitlistKeys: [StrayWaitlistKeys] extends [never] ? true : never = true;
void noStrayWaitlistKeys;

/**
 * Слова лендинга под режим входа платформы.
 *
 * Пока вход идёт по заявкам, обещания «страница живёт с первой услуги» и «в
 * сети уже сегодня» заменяются тем, что правда происходит после кнопки.
 * Открыли регистрацию — страница вернулась к прежним словам сама, без правки.
 */
export function landingCopy(messages: Messages, mode: RegistrationMode): LandingCopy {
  return mode === 'moderated'
    ? { ...messages.marketing, ...messages.marketingWaitlist }
    : messages.marketing;
}

/*
 * Короткие служебные слова, которые не имеют права остаться последними в
 * строке: «остаётся у / вашего дела» читается как обрыв. Английский не
 * клеится — там висячий артикль нормой не считается.
 */
const GLUE: Partial<Record<Locale, RegExp>> = {
  ru: /(?<=^|[\s(«])(а|без|в|во|для|до|за|и|из|к|ко|на|над|не|ни|но|о|об|от|по|под|при|про|с|со|у)\s+/giu,
  lv: /(?<=^|[\s(«])(ar|bez|ir|kā|lai|ne|no|par|pie|un|uz|vai)\s+/giu,
};

const NBSP = ' ';

/**
 * Типографика строки: тире не начинает строку, число не отрывается от
 * единицы, короткий предлог — от своего слова.
 */
export function typeset(text: string, locale: Locale): string {
  let out = text.replace(/\s+—/g, `${NBSP}—`).replace(/(\d)\s+(?=\p{L})/gu, `$1${NBSP}`);
  const glue = GLUE[locale];
  if (glue) out = out.replace(glue, `$1${NBSP}`);
  return out;
}

/** Весь словарь лендинга через `typeset` — вместе с наборами форм множественного числа. */
export function typesetCopy(copy: LandingCopy, locale: Locale): LandingCopy {
  const set = (value: unknown): unknown =>
    typeof value === 'string'
      ? typeset(value, locale)
      : value && typeof value === 'object'
        ? Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, set(inner)]))
        : value;

  return set(copy) as LandingCopy;
}
