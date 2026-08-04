import { cache } from 'react';

import { serverApiFetch } from '@/lib/server-api';

import { DEFAULT_LOCALE } from './config';

/**
 * The signed-in person's own dashboard language, for server components.
 *
 * Wrapped in React's `cache` so a layout and the page it renders share one
 * `/auth/me` call per request — `serverApiFetch` is `no-store`, so without it
 * every caller would make its own round trip.
 *
 * A failed call is not a reason to bounce anyone: the panel opens in the
 * default language and whatever guard actually owns the redirect handles it.
 */
export const getRequestLocale = cache(async (): Promise<string> => {
  try {
    const me = await serverApiFetch<{ user?: { locale?: string } }>('/auth/me');
    return me.user?.locale ?? DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
});
