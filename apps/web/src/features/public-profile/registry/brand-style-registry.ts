'use client';

import dynamic from 'next/dynamic';
import { createElement, type ComponentType, type ReactNode } from 'react';

import { resolveCompositionKey, type BrandStyleKey, type CompositionKey } from './brand-style';

type CompositionRootComponent = ComponentType<{ children: ReactNode }>;

/**
 * Каноническая модель реестра (BRAND_STYLE_ARCHITECTURE.md §8.2): мир = один
 * модуль = один dynamic boundary. Единственное место, знающее все миры;
 * никаких per-slot `dynamic()`. `next/dynamic` с SSR по умолчанию — первый
 * кадр серверный, CSS мира приезжает с его чанком в SSR-выдаче.
 *
 * Каталог закрыт на пяти мирах, и у каждого своё дерево: `soft` и `poster` —
 * классики, с которыми продукт вышел; `luxury`, `aura` и `funk` пришли
 * готовыми файлами от авторов (грейж-разворот «Bergs», `aura.html`,
 * `brutal.html`), и свои композиции им нужны потому, что их структура не
 * выражается ни одним из классических деревьев.
 *
 * Общих чанков в реестре не осталось: каждая строка — свой модуль и свой
 * dynamic boundary.
 */
const ROOTS: Record<CompositionKey, CompositionRootComponent> = {
  soft: dynamic(() => import('../compositions/soft/root')),
  poster: dynamic(() => import('../compositions/poster/root')),
  luxury: dynamic(() => import('../compositions/luxury/root')),
  aura: dynamic(() => import('../compositions/aura/root')),
  funk: dynamic(() => import('../compositions/funk/root')),
};

/**
 * Единственный boundary на сегмент: layout и все страницы route-группы живут
 * под одним `CompositionRoot` — ни дублирующих boundary, ни водопадов чанков.
 */
export function CompositionRoot({
  styleKey,
  children,
}: {
  styleKey: BrandStyleKey;
  children: ReactNode;
}) {
  // createElement вместо JSX: модуль реестра остаётся .ts — JSX требовал бы
  // расширения .tsx, а имя файла зафиксировано §8.2.
  return createElement(ROOTS[resolveCompositionKey(styleKey)], null, children);
}
