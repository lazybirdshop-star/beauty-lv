/**
 * Срок жизни записи словами.
 *
 * В описи срок хранится числом секунд — одним значением для всех языков, и
 * править его нужно там же, где стоит `maxAge` в коде. Здесь число становится
 * фразой; формы слова приходит подставлять перевод, потому что «365 дней»,
 * «365 dienas» и «365 days» подчиняются трём разным грамматикам.
 */
import { plural } from '@/lib/i18n/messages';

export interface LifetimeWords {
  /** Хранилище без срока: живёт, пока его не очистят. */
  readonly persistent: string;
  readonly day: PluralForms;
  readonly hour: PluralForms;
  readonly minute: PluralForms;
}

type PluralForms = Parameters<typeof plural>[2];

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatLifetime(
  seconds: number | null,
  words: LifetimeWords,
  locale: string,
): string {
  if (seconds === null) return words.persistent;

  // Единица выбирается по самой крупной, в которую срок укладывается нацело:
  // «12 часов» вместо «0,5 дня» и «30 минут» вместо «0,5 часа».
  const unit =
    seconds % DAY === 0
      ? { count: seconds / DAY, forms: words.day }
      : seconds % HOUR === 0
        ? { count: seconds / HOUR, forms: words.hour }
        : { count: Math.round(seconds / MINUTE), forms: words.minute };

  return `${unit.count} ${plural(locale, unit.count, unit.forms)}`;
}
