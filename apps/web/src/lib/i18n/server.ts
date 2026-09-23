import { me } from '@/lib/me';

import { DEFAULT_LOCALE } from './config';

/**
 * The signed-in person's own dashboard language, for server components.
 *
 * The `/auth/me` call itself lives in `lib/me.ts` and is shared with
 * `currentUserName`: both values come off one user row, and React's `cache`
 * only ever deduplicates calls to the same function — two wrappers meant two
 * round trips on every dashboard navigation.
 *
 * A failed call is not a reason to bounce anyone: the panel opens in the
 * default language and whatever guard actually owns the redirect handles it.
 */
export async function getRequestLocale(): Promise<string> {
  return (await me())?.locale ?? DEFAULT_LOCALE;
}
