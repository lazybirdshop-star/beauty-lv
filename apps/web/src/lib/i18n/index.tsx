'use client';

import { createContext, useContext, type ReactNode } from 'react';

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
