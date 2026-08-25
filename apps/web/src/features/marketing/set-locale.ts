'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

import { LOCALES, LOCALE_COOKIE, type Locale } from '@/lib/i18n/config';

/**
 * Запомнить язык лендинга.
 *
 * Серверное действие, а не запись в `document.cookie`: тогда переключатель —
 * обычная форма и работает до того, как приедет и выполнится JavaScript.
 * Лендинг открывают по ссылке из Instagram на телефоне в дороге, и первый
 * же элемент управления не должен зависеть от гидратации.
 *
 * Значение проверяется по списку языков: в форму приходит то, что прислал
 * клиент, а не то, что мы отрисовали.
 */
export async function setMarketingLocale(formData: FormData): Promise<void> {
  const requested = formData.get('locale');

  if (typeof requested !== 'string' || !LOCALES.includes(requested as Locale)) {
    return;
  }

  /*
   * Какую страницу пересобрать. Переключатель стоит не только на главной:
   * юридические тексты живут на своих адресах и переводятся тем же
   * действием, а `revalidatePath('/')` оставил бы читателя политики на
   * прежнем языке. Значение приходит из формы и потому проверяется: берём
   * только собственный путь, начинающийся с одной косой черты.
   */
  const submitted = formData.get('path');
  const path = typeof submitted === 'string' && /^\/[\w\-/]*$/.test(submitted) ? submitted : '/';

  const store = await cookies();
  store.set(LOCALE_COOKIE, requested, {
    path: '/',
    // Год: выбор языка переживает закрытие вкладки.
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    httpOnly: false,
  });

  revalidatePath(path);
}
