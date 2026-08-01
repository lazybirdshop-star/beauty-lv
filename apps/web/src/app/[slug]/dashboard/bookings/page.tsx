import { BookingsScreen } from '@/features/bookings/components/bookings-screen';

interface BookingsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function BookingsPage({ params }: BookingsPageProps) {
  const { slug } = await params;
  return <BookingsScreen slug={slug} />;
}
