'use client';

import { LOCALES, LOCALE_NAMES, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface PublicLanguagePickerProps {
  value: string;
  onChange: (locale: string) => void;
}

/**
 * Язык публичной страницы — не язык браузера клиента.
 *
 * Рижский мастер, работающий с русскоязычными, решает это сам, и решение это
 * относится к тому же, к чему имя и описание: к тексту, который читает гость.
 * Поэтому выбор стоит и в настройках страницы, и в онбординге — а разметка у
 * него одна: два одинаковых ряда кнопок разъехались бы при первой же правке.
 */
export function PublicLanguagePicker({ value, onChange }: PublicLanguagePickerProps) {
  const t = useT();

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-ink-soft">{t.profilePage.publicLanguage}</span>
      <div className="flex gap-2">
        {LOCALES.map((code) => (
          <button
            key={code}
            type="button"
            aria-pressed={value === code}
            onClick={() => onChange(code)}
            className={cn(
              'press min-h-11 flex-1 rounded-xl border px-3 text-sm font-semibold',
              value === code
                ? 'border-accent bg-accent text-accent-contrast'
                : 'border-border text-ink hover:border-border-strong',
            )}
          >
            {LOCALE_NAMES[code]}
          </button>
        ))}
      </div>
      <span className="text-xs text-ink-faint">{t.pageSettings.languageHint}</span>
    </div>
  );
}
