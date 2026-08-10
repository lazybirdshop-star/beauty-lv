'use client';

import type { ReactNode } from 'react';

import { CompositionProvider } from '../../registry/composition-context';

import { composition } from './index';

/** Тонкий root-провайдер плакатного мира (§8.2): единственный dynamic boundary композиции. */
export default function PosterRoot({ children }: { children: ReactNode }) {
  return (
    <CompositionProvider styleKey="poster" composition={composition}>
      {children}
    </CompositionProvider>
  );
}
