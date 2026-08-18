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
}: {
  active: Locale;
  className: string;
  label: string;
}) {
  return (
    <form action={setMarketingLocale} className={className} aria-label={label}>
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
