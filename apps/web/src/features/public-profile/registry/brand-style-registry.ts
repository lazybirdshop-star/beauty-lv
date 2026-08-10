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
 * Коллекция закрыта на пяти композициях (решение M8): soft, poster, minimal,
 * luxury, neo-glass. Minimal приземлился первым (M3), Luxury — вторым (M4),
 * Neo Glass — третьим (M6); все трое обслуживают собственные чанки.
 *
 * `editorial` и `organic` — не алиасы миграции, а постоянные члены школы
 * soft (§8.3, §14.2): собственных композиций они не получают никогда, и
 * общий с soft чанк здесь — конечное состояние, а не долг. От soft они
 * отличаются палитрой и парой гарнитур, то есть ровно тем же, чем
 * отличается `soft-studio`. Очередь burn-down в TASKS.md пуста.
 */
const ROOTS: Record<CompositionKey, CompositionRootComponent> = {
  soft: dynamic(() => import('../compositions/soft/root')),
  poster: dynamic(() => import('../compositions/poster/root')),
  minimal: dynamic(() => import('../compositions/minimal/root')),
  luxury: dynamic(() => import('../compositions/luxury/root')),
  'neo-glass': dynamic(() => import('../compositions/neo-glass/root')),
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
