'use client';

import { createContext, useContext, type ReactNode } from 'react';

import { DEFAULT_LOCALE, resolveLocale, type Locale } from './config';
import { en } from './en';
import { lv } from './lv';
import { ru, type Messages, type PartialMessages } from './messages';

const DICTIONARIES: Record<Locale, PartialMessages> = { ru, lv, en };

/**
 * Merged one section at a time against Russian, so a key a translator has not
 * reached yet renders in Russian rather than as `bookings.groupPending`. A
 * half-finished translation should look unfinished, not broken.
 */
function buildMessages(locale: Locale): Messages {
  const overrides = DICTIONARIES[locale] ?? {};

  return Object.fromEntries(
    (Object.keys(ru) as (keyof Messages)[]).map((section) => [
      section,
      { ...ru[section], ...(overrides[section] ?? {}) },
    ]),
  ) as Messages;
}

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

/** For server components, which have no context to read. */
export function getMessages(locale: string | null | undefined): Messages {
  return buildMessages(resolveLocale(locale));
}

export { fmt, plural } from './messages';
export type { Messages } from './messages';
export { LOCALES, LOCALE_NAMES, DEFAULT_LOCALE, resolveLocale } from './config';
export type { Locale } from './config';
