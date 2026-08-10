'use client';

import type { PublicOrganization } from '../engine/types';

import { useComposition } from './composition-context';

/** Хост страницы контактов (§8.2): слот контактов мира из контекста композиции. */
export function ContactsHost({ org }: { org: PublicOrganization }) {
  const { ContactsSection } = useComposition();
  return <ContactsSection org={org} />;
}
