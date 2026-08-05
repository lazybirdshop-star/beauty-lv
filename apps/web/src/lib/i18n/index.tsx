'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';

import { DEFAULT_LOCALE, resolveLocale, type Locale } from './config';
import { ru, type Messages } from './messages';
import { buildMessages } from './resolve';

const MessagesContext = createContext<{ locale: Locale; messages: Messages }>({
  locale: DEFAULT_LOCALE,
  messages: ru,
});

export function I18nProvider({
  locale,
  children,
}: {
  locale: string | null | undefined;
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
    <MessagesContext.Provider value={{ locale: resolved, messages: buildMessages(resolved) }}>
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

export { fmt, plural } from './messages';
export type { Messages } from './messages';
export { LOCALES, LOCALE_NAMES, DEFAULT_LOCALE, resolveLocale } from './config';
export type { Locale } from './config';
