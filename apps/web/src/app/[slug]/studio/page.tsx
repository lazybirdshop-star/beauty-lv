import { StudioLoader } from '@/features/design-studio/components/studio-loader';

interface StudioPageProps {
  params: Promise<{ slug: string }>;
}

export default async function StudioPage({ params }: StudioPageProps) {
  const { slug } = await params;
  return <StudioLoader slug={slug} />;
}
