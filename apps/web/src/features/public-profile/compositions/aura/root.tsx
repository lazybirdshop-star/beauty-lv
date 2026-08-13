'use client';

import type { ReactNode } from 'react';

import { CompositionProvider } from '../../registry/composition-context';

import { composition } from './index';

/* Материал и хореография мира едут с его чанком: CSS импортируется здесь, у
   единственного dynamic boundary композиции (§8.2). `next/dynamic` держит
   SSR включённым, поэтому Next кладёт стилевой лист этого чанка в <head>
   первичной выдачи — правила `.aura-*` действуют уже на первом кадре, и
   входные анимации стартуют со своего нулевого состояния, а не мигают
   неоформленным узлом (риск R4, §13.2). */
import './motion.css';

/** Тонкий root-провайдер мира AURA (§8.2): единственный dynamic boundary композиции. */
export default function AuraRoot({ children }: { children: ReactNode }) {
  return (
    <CompositionProvider styleKey="aura" composition={composition}>
      {children}
    </CompositionProvider>
  );
}
