import { CalendarScreen } from '@/features/scheduling/components/calendar-screen';

interface CalendarPageProps {
  params: Promise<{ slug: string }>;
}

export default async function CalendarPage({ params }: CalendarPageProps) {
  const { slug } = await params;
  return <CalendarScreen slug={slug} />;
}
