import type { Metadata } from 'next';

import { FinalCtaSection } from '@/features/marketing/components/final-cta-section';
import { HeroSection } from '@/features/marketing/components/hero-section';
import { HowItWorksSection } from '@/features/marketing/components/how-it-works-section';
import { ProblemSection } from '@/features/marketing/components/problem-section';
import { SiteFooter } from '@/features/marketing/components/site-footer';
import { TopNav } from '@/features/marketing/components/top-nav';
import { ValueSection } from '@/features/marketing/components/value-section';

export const metadata: Metadata = {
  title: 'Beauty.lv: онлайн-запись для мастеров красоты',
  description:
    'Мастер публикует свободные окна, клиент бронирует в два тапа. Онлайн-запись без звонков и переписки.',
};

/**
 * Root marketing site (see ARCHITECTURE.md §3.1): a brochure/landing page,
 * deliberately without a public master directory. Distinct from the
 * `[slug]` tenant pages, which stand in for the future
 * `{username}.beauty.lv` subdomain.
 */
export default function MarketingHomePage() {
  return (
    <>
      <TopNav />
      <main className="flex-1">
        <HeroSection />
        <ProblemSection />
        <HowItWorksSection />
        <ValueSection />
        <FinalCtaSection />
      </main>
      <SiteFooter />
    </>
  );
}
