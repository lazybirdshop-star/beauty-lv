'use client';

import dynamic from 'next/dynamic';
import { createElement, type ComponentType, type ReactNode } from 'react';

import type { BrandStyleKey } from './brand-style';

type CompositionRootComponent = ComponentType<{ children: ReactNode }>;

/**
 * Каноническая модель реестра (BRAND_STYLE_ARCHITECTURE.md §8.2): мир = один
 * модуль = один dynamic boundary. Единственное место, знающее все миры;
 * никаких per-slot `dynamic()`. `next/dynamic` с SSR по умолчанию — первый
 * кадр серверный, CSS мира приезжает с его чанком в SSR-выдаче.
 *
 * Алиасы — только временное состояние миграции (§8.3): editorial,
 * organic и neo-glass ещё не приземлились и работают на soft-композиции
 * (чанк общий). У каждого алиаса стоит шаг, который его снимает
 * (П5–П9 / M3–M7 — burn-down в TASKS.md); конечное состояние — семь
 * собственных композиций. Minimal приземлился первым (M3), Luxury —
 * вторым (M4); оба обслуживают собственные чанки.
 */
const ROOTS: Record<BrandStyleKey, CompositionRootComponent> = {
  soft: dynamic(() => import('../compositions/soft/root')),
  poster: dynamic(() => import('../compositions/poster/root')),
  minimal: dynamic(() => import('../compositions/minimal/root')),
  luxury: dynamic(() => import('../compositions/luxury/root')),
  editorial: dynamic(() => import('../compositions/soft/root')),
  organic: dynamic(() => import('../compositions/soft/root')),
  'neo-glass': dynamic(() => import('../compositions/soft/root')),
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
  return createElement(ROOTS[styleKey], null, children);
}
