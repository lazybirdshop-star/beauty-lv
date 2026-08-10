'use client';

import type { ReactNode } from 'react';

import type { PublicOrganization } from '../engine/types';

import { useComposition } from './composition-context';

/**
 * Тонкий клиентский хост каркаса (§8.2): серверный layout отдаёт данные и
 * страницы сегмента, мир решает, как они расположены. Никакого ветвления по
 * ключу стиля — только слот из контекста.
 */
export function ShellHost({ org, children }: { org: PublicOrganization; children: ReactNode }) {
  const { Shell } = useComposition();
  return <Shell org={org}>{children}</Shell>;
}
