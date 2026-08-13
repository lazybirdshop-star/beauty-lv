'use client';

import type { ReactNode } from 'react';

import { CompositionProvider } from '../../registry/composition-context';

import { composition } from './index';

/* Материал и хореография мира едут с его чанком: CSS импортируется здесь, у
   единственного dynamic boundary композиции (§8.2). SSR у `next/dynamic`
   включён, поэтому правила `.min-*` действуют уже на первом кадре. */
import './motion.css';

/** Тонкий root-провайдер мира MINIMAL (§8.2): единственный dynamic boundary. */
export default function MinimalRoot({ children }: { children: ReactNode }) {
  return (
    <CompositionProvider styleKey="minimal" composition={composition}>
      {children}
    </CompositionProvider>
  );
}
