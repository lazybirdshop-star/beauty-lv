'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';

import { DEFAULT_LOCALE, resolveLocale, type Locale } from './config';
import { ru, type Messages } from './messages';

const MessagesContext = createContext<{ locale: Locale; messages: Messages }>({
  locale: DEFAULT_LOCALE,
  messages: ru,
});

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: string | null | undefined;
  /**
   * Готовый словарь — для языков, кроме русского.
   *
   * Здесь стояло `buildMessages(resolved)`, то есть слияние выполнялось в
   * браузере, а ради него этот модуль тянул в клиентский граф **все три**
   * словаря сразу: 344 КБ (107 КБ gzip) на каждом маршруте, включая тот, где
   * из них не читается ни строки. На публичной странице мастера — той, что
   * открывают по ссылке из шапки Instagram, — это было 79% всего веса при
   * 10 КБ собственного кода страницы.
   *
   * Русский остаётся статикой: он база слияния, нужен всегда и одинаков для
   * всех, поэтому его место — в кэшируемом чанке, а не в разметке каждого
   * ответа. `lv` и `en` приезжают отсюда, уже слитыми на сервере, и только
   * тому, кто их читает (`clientMessages`).
   */
  messages?: Messages;
  children: ReactNode;
}) {
  const resolved = resolveLocale(locale);

  /*
   * `<html lang>` has to say what the page is actually written in: a screen
   * reader picks its voice from it, and the root layout hard-coded `ru` for
   * every visitor. Only the root layout can render `<html>`, and it is shared
   * by the public page (locale from the organisation) and the panel (locale
   * from the user) — so the subtree that does know corrects it here. The
   * server-rendered attribute stays at the default for one frame; assistive
   * tech reads the live DOM, which is the case this fixes.
   */
  useEffect(() => {
    document.documentElement.lang = resolved;
  }, [resolved]);

  return (
    <MessagesContext.Provider value={{ locale: resolved, messages: messages ?? ru }}>
      {children}
    </MessagesContext.Provider>
  );
}

/** `const t = useT(); t.bookings.groupPending` — typed, so a typo will not build. */
export function useT(): Messages {
  return useContext(MessagesContext).messages;
}

export function useLocale(): Locale {
  return useContext(MessagesContext).locale;
}

/*
 * `fmt` и `plural` отсюда больше не экспортируются, и это не вкусовщина.
 *
 * Модуль помечен 'use client' ради провайдера и хуков. Любая функция,
 * вывезенная через него, становится «клиентской»: вызов её из серверного
 * компонента роняет страницу целиком — «Attempted to call fmt() from the
 * server». Ровно так однажды легла главная админ-панели, и сборка этого не
 * поймала: страница рендерится по запросу, до исполнения дело доходит только
 * в проде.
 *
 * Обе функции чистые, границы им не нужно — их место в словаре:
 * `import { fmt } from '@/lib/i18n/messages'`. Оттуда они одинаково доступны
 * и клиенту, и серверу.
 */
export type { Messages } from './messages';
export { LOCALES, LOCALE_NAMES, DEFAULT_LOCALE, resolveLocale } from './config';
export type { Locale } from './config';
