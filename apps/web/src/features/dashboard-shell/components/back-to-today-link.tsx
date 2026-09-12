'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

/**
 * Ссылка на «Сегодня» для экранов, у которых нет параметров маршрута:
 * `not-found.tsx` их не получает, а адрес кабинета всё равно нужен.
 */
export function BackToTodayLink({ label }: { label: string }) {
  const params = useParams<{ slug?: string }>();
  const slug = typeof params?.slug === 'string' ? params.slug : null;

  return (
    <Link className="btn btn-secondary" href={slug ? `/${slug}/dashboard` : '/'}>
      {label}
    </Link>
  );
}
