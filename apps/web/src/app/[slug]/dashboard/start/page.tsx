import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { OnboardingScreen } from '@/features/onboarding/components/onboarding-screen';
import { Skeleton } from '@/components/ui/skeleton';
import { capabilitiesOf } from '@/features/dashboard-shell/capabilities';
import { getMessages } from '@/lib/i18n/resolve';
import { getRequestLocale } from '@/lib/i18n/server';
import { requireOrganization } from '@/lib/require-organization';

interface StartPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = getMessages(await getRequestLocale());
  return { title: t.onboarding.title };
}

export default async function StartPage({ params }: StartPageProps) {
  const { slug } = await params;
  /* Знакомство настраивает заведение — его проходит та, кто им управляет.
     Наёмный мастер по прямому адресу сюда не попадает. */
  if (!capabilitiesOf(await requireOrganization(slug)).canManageWorkspace) notFound();
  /* `useSearchParams` (the step in the URL) opts the tree into client-side
     rendering, and Next requires the boundary to be explicit. */
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <OnboardingScreen slug={slug} />
    </Suspense>
  );
}
