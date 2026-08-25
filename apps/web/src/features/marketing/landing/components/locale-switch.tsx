/* Выбор языка лендинга.

   Три языка стоят раскрытыми, а не под выпадающим списком: их всего три, и
   посетитель, пришедший на чужом языке, должен увидеть свой сразу, а не
   догадаться нажать на глобус.

   Обычная форма с серверным действием — никакого клиентского состояния:
   переключатель работает до гидратации, а язык живёт в куке, не в адресе
   (принцип `i18n/config.ts`: ссылка мастера обязана остаться
   `amolie.com/{slug}`). */
import { LOCALES, LOCALE_NAMES, type Locale } from '@/lib/i18n/config';

import { setMarketingLocale } from '../../set-locale';

export function LocaleSwitch({
  active,
  className,
  label,
  /** Какую страницу пересобрать после выбора. По умолчанию — главная. */
  path = '/',
}: {
  active: Locale;
  className: string;
  label: string;
  path?: string;
}) {
  return (
    <form action={setMarketingLocale} className={className} aria-label={label}>
      <input type="hidden" name="path" value={path} />
      {LOCALES.map((code) => (
        <button
          key={code}
          type="submit"
          name="locale"
          value={code}
          lang={code}
          aria-label={LOCALE_NAMES[code]}
          aria-current={code === active ? 'true' : undefined}
          className={`lang-btn${code === active ? ' is-active' : ''}`}
        >
          {code}
        </button>
      ))}
    </form>
  );
}
