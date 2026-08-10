'use client';

import type { ReactNode } from 'react';

import { CompositionProvider } from '../../registry/composition-context';

import { composition } from './index';

/* Хореография мира едет с его чанком: CSS импортируется здесь, у единственного
   dynamic boundary композиции (§8.2), — в SSR-выдаче первый кадр уже
   содержит эти правила, мигания входных анимаций нет (риск R4). */
import './motion.css';

/**
 * Тонкий root-провайдер мира Minimal (§8.2): единственный dynamic boundary
 * композиции. С шага M3 мир обслуживает собственный чанк — алиас на soft
 * снят (burn-down в TASKS.md).
 */
export default function MinimalRoot({ children }: { children: ReactNode }) {
  return (
    <CompositionProvider styleKey="minimal" composition={composition}>
      {children}
    </CompositionProvider>
  );
}
