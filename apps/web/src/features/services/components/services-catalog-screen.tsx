'use client';

import { useState } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { PricingScreen } from './pricing-screen';
import { ServicesScreen } from './services-screen';

export type ServicesTab = 'list' | 'showcase';

interface ServicesCatalogScreenProps {
  slug: string;
  initialTab: ServicesTab;
}

/**
 * «Услуги» and «Цены» used to be two nav entries over the same data — the
 * price screen has always reused the services endpoints and the `isActive`
 * flag. They are now two tabs of one screen: editing the catalogue and
 * deciding what the public price list shows are two views of one thing, not
 * two places.
 *
 * The initial tab arrives from the server page's query string so
 * `/dashboard/pricing` can redirect straight onto the showcase tab and old
 * links keep working.
 */
export function ServicesCatalogScreen({ slug, initialTab }: ServicesCatalogScreenProps) {
  const [tab, setTab] = useState<ServicesTab>(initialTab);

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as ServicesTab)}>
      <TabsList className="mb-4">
        <TabsTrigger value="list">Список</TabsTrigger>
        <TabsTrigger value="showcase">Витрина</TabsTrigger>
      </TabsList>

      <TabsContent value="list">
        <ServicesScreen slug={slug} />
      </TabsContent>
      <TabsContent value="showcase">
        <PricingScreen slug={slug} />
      </TabsContent>
    </Tabs>
  );
}
