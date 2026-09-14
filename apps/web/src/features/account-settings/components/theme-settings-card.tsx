'use client';

/**
 * «Оформление кабинета» — тема: светлая, тёмная или как в системе (прототип
 * «Кабинет 2026», экран `settings`).
 *
 * Три положения, а не луна в шапке: «как в системе» — отдельное решение
 * («днём светлая, вечером тёмная»), и у кнопки на два состояния ему места
 * нет. Кнопка в шапке остаётся быстрым переключателем.
 */
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';

import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { useT } from '@/lib/i18n';

const THEMES = ['light', 'dark', 'system'] as const;

const noopSubscribe = () => () => {};

export function ThemeSettingsCard() {
  const t = useT();
  const { theme, setTheme } = useTheme();
  /* Выбор известен только после гидратации: до неё сервер не знает, что
     записано в браузере, и отмеченный вариант был бы догадкой. */
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const current = mounted ? (theme ?? 'system') : null;

  const label = (key: (typeof THEMES)[number]) =>
    key === 'light'
      ? t.settings.themeLight
      : key === 'dark'
        ? t.settings.themeDark
        : t.settings.themeSystem;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.settings.themeTitle}</CardTitle>
      </CardHeader>
      <div className="form-field">
        <span className="form-field__label" id="settings-theme-label">
          {t.settings.themeLabel}
        </span>
        <div className="seg-pills" role="group" aria-labelledby="settings-theme-label">
          {THEMES.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={current === key}
              onClick={() => setTheme(key)}
            >
              {label(key)}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}
