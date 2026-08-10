'use client';

import type { ReactNode } from 'react';

import { CompositionProvider } from '../../registry/composition-context';

import { composition } from './index';

/**
 * Тонкий root-провайдер мягкого мира (§8.2): единственный dynamic boundary
 * композиции. На переходный период M2 его чанк разделяют алиасы minimal,
 * luxury, editorial, organic и neo-glass (§8.3) — снятие каждого алиаса
 * зафиксировано burn-down'ом в TASKS.md.
 */
export default function SoftRoot({ children }: { children: ReactNode }) {
  return (
    <CompositionProvider styleKey="soft" composition={composition}>
      {children}
    </CompositionProvider>
  );
}
