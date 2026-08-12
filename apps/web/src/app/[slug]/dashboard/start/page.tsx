import type { Metadata } from 'next';
import { Suspense } from 'react';

import { OnboardingScreen } from '@/features/onboarding/components/onboarding-screen';
import { Skeleton } from '@/components/ui/skeleton';
import { getMessages } from '@/lib/i18n/resolve';
import { getRequestLocale } from '@/lib/i18n/server';

interface StartPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = getMessages(await getRequestLocale());
  return { title: t.onboarding.title };
}

export default async function StartPage({ params }: StartPageProps) {
  const { slug } = await params;
  /* `useSearchParams` (the step in the URL) opts the tree into client-side
     rendering, and Next requires the boundary to be explicit. */
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <OnboardingScreen slug={slug} />
    </Suspense>
  );
}
