import { LOCALES, LOCALE_NAMES, type Locale } from '@/lib/i18n/config';

import { setMarketingLocale } from '../set-locale';

/**
 * Выбор языка лендинга.
 *
 * Три языка стоят раскрытыми, а не под выпадающим списком: их всего три, и
 * посетитель, пришедший на чужом языке, должен увидеть свой сразу, а не
 * догадаться нажать на глобус.
 *
 * Обычная форма с серверным действием — никакого клиентского состояния:
 * переключатель работает до гидратации, а язык живёт в куке, не в адресе
 * (принцип `config.ts`: ссылка мастера обязана остаться `amolie.com/{slug}`).
 */
export function LanguageSwitcher({ active }: { active: Locale }) {
  return (
    <form action={setMarketingLocale} className="flex items-center gap-1">
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="submit"
          name="locale"
          value={locale}
          lang={locale}
          aria-label={LOCALE_NAMES[locale]}
          aria-current={locale === active ? 'true' : undefined}
          className={`relative min-h-11 px-2 text-[11px] font-medium uppercase tracking-[0.16em] transition-colors after:absolute after:inset-x-1 after:bottom-3 after:h-px after:transition-colors ${
            locale === active
              ? 'text-[var(--lp-ink)] after:bg-[var(--lp-accent)]'
              : 'text-[var(--lp-ink-faint)] after:bg-transparent hover:text-[var(--lp-ink)]'
          }`}
        >
          {locale}
        </button>
      ))}
    </form>
  );
}
