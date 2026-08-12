'use client';

import { useSyncExternalStore } from 'react';

const noopSubscribe = () => () => {};

/**
 * The host this panel is actually served from, without the protocol —
 * `amolie.com` in production, `localhost:3000` in development.
 *
 * Read through a store rather than `typeof window` during render: the server
 * has no host and the classic guard makes the first client render disagree
 * with the HTML it is hydrating, which throws the whole tree away. Here the
 * server and the hydration pass both see `fallback`, and the real host
 * arrives on the commit after.
 */
export function useDisplayOrigin(fallback: string): string {
  return useSyncExternalStore(
    noopSubscribe,
    () => window.location.host,
    () => fallback,
  );
}
