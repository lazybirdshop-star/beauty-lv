'use client';

import { ZONE_ATTRIBUTE } from '@/features/design-studio/preview-bridge';

import type { PublicOrganization } from '../engine/types';

import { useComposition } from './composition-context';

/** Хост страницы контактов (§8.2): слот контактов мира из контекста композиции. */
export function ContactsHost({ org }: { org: PublicOrganization }) {
  const { ContactsSection } = useComposition();
  return (
    <div style={{ display: 'contents' }} {...{ [ZONE_ATTRIBUTE]: 'cards' }}>
      <ContactsSection org={org} />
    </div>
  );
}
