import { PricingScreen } from '@/features/services/components/pricing-screen';

interface PricingPageProps {
  params: Promise<{ slug: string }>;
}

export default async function PricingPage({ params }: PricingPageProps) {
  const { slug } = await params;
  return <PricingScreen slug={slug} />;
}
