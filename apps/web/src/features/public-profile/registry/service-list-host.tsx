'use client';

import { ZONE_ATTRIBUTE } from '@/features/design-studio/preview-bridge';

import type { PublicOrganization } from '../engine/types';

import { useComposition } from './composition-context';

/** Хост страницы прайса (§8.2): слот прайса мира из контекста композиции. */
export function ServiceListHost({ org }: { org: PublicOrganization }) {
  const { ServiceListSection } = useComposition();
  return (
    /* `display: contents` — обёртка без бокса: раскладка мира не меняется, а
       холст Студии получает зону «Карточки» (DESIGN_STUDIO.md §3.3). */
    <div style={{ display: 'contents' }} {...{ [ZONE_ATTRIBUTE]: 'cards' }}>
      <ServiceListSection org={org} />
    </div>
  );
}
