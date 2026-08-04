'use client';

import { Moon, Sun } from '@phosphor-icons/react';
import { useT } from '@/lib/i18n';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';

const noopSubscribe = () => () => {};

/** True only after hydration — avoids a mismatch against the OS-preference-resolved theme without a setState-in-effect. */
function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function ThemeToggle() {
  const t = useT();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted) {
    return <div className="h-11 w-11" aria-hidden="true" />;
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
      <span className="sr-only">{t.common.toggleTheme}</span>
    </button>
  );
}
