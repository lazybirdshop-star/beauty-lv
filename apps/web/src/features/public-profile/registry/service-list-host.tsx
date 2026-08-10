'use client';

import type { PublicOrganization } from '../engine/types';

import { useComposition } from './composition-context';

/** Хост страницы прайса (§8.2): слот прайса мира из контекста композиции. */
export function ServiceListHost({ org }: { org: PublicOrganization }) {
  const { ServiceListSection } = useComposition();
  return <ServiceListSection org={org} />;
}
