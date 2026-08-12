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

/**
 * The same address with its protocol — what actually goes into a QR code or
 * onto the clipboard.
 *
 * Separate from `useDisplayOrigin` because the two are used for opposite
 * purposes: one is read by a human, who does not want to see `https://`, and
 * one is opened by a machine, which cannot do without it. Composing the
 * second from the first by prepending `https://` is what produced
 * `https://localhost:3000` in development — a QR code that leads nowhere.
 */
export function usePageOrigin(fallback: string): string {
  return useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => fallback,
  );
}
