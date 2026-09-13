'use client';

/**
 * Переключатель темы значком — прототип «Кабинет 2026», правый край шапки.
 *
 * Тема стоит и в карточке аккаунта: там она свойство рабочего места, которое
 * ищут осознанно, а здесь — одно нажатие для того, кто переключает её по
 * свету в комнате, а не по настроению раз в полгода.
 *
 * До гидратации значок показывает луну и молчит о состоянии: тему `next-themes`
 * разрешает уже в браузере, и печатать «светлая» на сервере значило бы
 * обещать состояние, которого сервер не знает.
 */
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';

import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n';

import { Icon } from './icon';

const noopSubscribe = () => () => {};

export function ThemeToggle() {
  const t = useT();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const dark = mounted && resolvedTheme === 'dark';

  return (
    <Button
      variant="raised"
      size="icon"
      className="workspace-theme"
      aria-label={dark ? t.common.themeLight : t.common.themeDark}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
    >
      <Icon name={dark ? 'sun' : 'moon'} className="ico-18" />
    </Button>
  );
}
