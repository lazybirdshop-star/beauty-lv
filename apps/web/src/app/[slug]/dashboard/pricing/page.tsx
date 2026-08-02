import { redirect } from 'next/navigation';

interface PricingPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * «Цены» merged into «Услуги» as its Витрина tab. The route stays as a
 * redirect rather than being deleted — bookmarks and any link a master
 * already sent herself must keep working.
 */
export default async function PricingPage({ params }: PricingPageProps) {
  const { slug } = await params;
  redirect(`/${slug}/dashboard/services?tab=showcase`);
}
