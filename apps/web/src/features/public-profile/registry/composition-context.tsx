'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { BrandStyleComposition } from '../contracts/composition';

import type { BrandStyleKey } from './brand-style';

interface CompositionContextValue {
  /**
   * Ключ мира, который реально рендерится (а не DB-пресет): для алиасов
   * переходного периода (§8.3) это ключ несущей композиции — `minimal`,
   * работая на soft-дереве, сообщает `soft`.
   */
  styleKey: BrandStyleKey;
  composition: BrandStyleComposition;
}

const CompositionContext = createContext<CompositionContextValue | null>(null);

/**
 * Провайдер мира (§8.2): его рендерит root-компонент композиции — единственная
 * точка, где объект композиции встречается с деревом. Хосты маршрутов читают
 * слоты отсюда, а не из собственных dynamic-импортов.
 */
export function CompositionProvider({
  styleKey,
  composition,
  children,
}: {
  styleKey: BrandStyleKey;
  composition: BrandStyleComposition;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ styleKey, composition }), [styleKey, composition]);
  return <CompositionContext.Provider value={value}>{children}</CompositionContext.Provider>;
}

export function useComposition(): BrandStyleComposition {
  const ctx = useContext(CompositionContext);
  if (!ctx) throw new Error('useComposition вне CompositionRoot');
  return ctx.composition;
}

/** Ключ рендерящейся композиции — например, для утилитарных экранов на токенах мира (§14.3). */
export function useBrandStyleKey(): BrandStyleKey {
  const ctx = useContext(CompositionContext);
  if (!ctx) throw new Error('useBrandStyleKey вне CompositionRoot');
  return ctx.styleKey;
}
