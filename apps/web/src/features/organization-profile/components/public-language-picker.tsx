'use client';

import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { LOCALES, LOCALE_NAMES, useT } from '@/lib/i18n';

interface PublicLanguagePickerProps {
  value: string;
  onChange: (locale: string) => void;
  id?: string;
}

/**
 * Язык публичной страницы — не язык браузера клиента.
 *
 * Рижский мастер, работающий с русскоязычными, решает это сам, и решение это
 * относится к тому же, к чему имя и описание: к тексту, который читает гость.
 * Поэтому выбор стоит и в настройках страницы, и в онбординге — а разметка у
 * него одна: две копии разъехались бы при первой же правке.
 *
 * Список, как в прототипе «Кабинет 2026»: языков три и станет больше, а ряд
 * кнопок во всю ширину на четвёртом уже не помещается в телефон.
 */
export function PublicLanguagePicker({
  value,
  onChange,
  id = 'public-language',
}: PublicLanguagePickerProps) {
  const t = useT();

  return (
    <Field id={id} label={t.profilePage.publicLanguage} hint={t.pageSettings.languageHint}>
      <Select
        id={id}
        aria-describedby={`${id}-hint`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_NAMES[code]}
          </option>
        ))}
      </Select>
    </Field>
  );
}
