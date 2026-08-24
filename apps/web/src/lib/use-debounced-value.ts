'use client';

import { useEffect, useState } from 'react';

/**
 * The value as it looked `delay` ms ago, once it stops changing.
 *
 * Used to keep the address field from asking the server on every keystroke:
 * typing «anna-nails» is eleven questions about ten addresses nobody wants.
 */
export function useDebouncedValue<T>(value: T, delay = 400): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return settled;
}
