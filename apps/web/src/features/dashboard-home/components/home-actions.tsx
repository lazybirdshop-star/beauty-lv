'use client';

/**
 * Правая часть шапки главной — по артборду `Main.dc.html`: поиск, колокол,
 * «Новая запись».
 *
 * Поиск пока ведёт в «Клиенты», а не открывает своё окно: быстрый поиск —
 * отдельный экран макета (`QuickSearch`), и рисовать поле, которое ничего не
 * ищет, значило бы обещать работу, которой нет. Клавиша «/» уводит туда же,
 * куда и нажатие, — сочетание из макета живёт с первого дня, а не появится
 * потом.
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { Icon } from '@/features/dashboard-shell/components/icon';
import { useT } from '@/lib/i18n';

export function HomeActions({ slug, unread }: { slug: string; unread: number }) {
  const t = useT();
  const router = useRouter();
  const clientsHref = `/${slug}/dashboard/clients`;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      /* Внутри поля «/» — это символ, а не команда. */
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable]')) return;
      event.preventDefault();
      router.push(clientsHref);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [router, clientsHref]);

  return (
    <>
      <Link className="search home-search" href={clientsHref}>
        <Icon name="search" className="ico-18" />
        <span style={{ flex: 1 }}>{t.home.searchPlaceholder}</span>
        <span className="kbd">/</span>
      </Link>

      <Link
        className="btn btn-secondary btn-icon"
        href={`/${slug}/dashboard/bookings`}
        aria-label={t.home.notifications}
        style={{ position: 'relative' }}
      >
        <Icon name="bell" className="ico-18" />
        {unread ? (
          <span
            style={{
              position: 'absolute',
              top: 7,
              right: 8,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--pink)',
              boxShadow: '0 0 0 2px #fff',
            }}
          />
        ) : null}
      </Link>

      <Link className="btn btn-primary" href={`/${slug}/dashboard/calendar`}>
        <Icon name="plus" className="ico-18" />
        <span>{t.home.newBooking}</span>
      </Link>
    </>
  );
}
