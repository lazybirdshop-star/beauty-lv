'use client';

/**
 * Правая часть шапки главной — по артборду `Main.dc.html`: поиск, колокол,
 * «Новая запись».
 *
 * Поиск открывает то самое окно из макета (`QuickSearch`), а «/» и ⌘K
 * открывают его откуда угодно в кабинете: сочетание нарисовано в подвале
 * окна, и работать оно обязано с первого дня, а не появиться потом.
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Icon } from '@/features/dashboard-shell/components/icon';
import { QuickSearch } from '@/features/dashboard-shell/components/quick-search';
import { useT } from '@/lib/i18n';

export function HomeActions({ slug, unread }: { slug: string; unread: number }) {
  const t = useT();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const combo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      const slash = event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey;
      if (!combo && !slash) return;

      /* Внутри поля «/» — это символ, а не команда. ⌘K перехватывается и там:
         в поле поиска кабинета он значит то же самое. */
      const target = event.target as HTMLElement | null;
      if (slash && target?.closest('input, textarea, select, [contenteditable]')) return;

      event.preventDefault();
      setOpen(true);
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <button className="search home-search" type="button" onClick={() => setOpen(true)}>
        <Icon name="search" className="ico-18" />
        <span style={{ flex: 1, textAlign: 'left' }}>{t.home.searchPlaceholder}</span>
        <span className="kbd">/</span>
      </button>

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

      {/* На телефоне эта кнопка живёт в полосе у нижнего края (`only-phone`
          ниже по экрану): наверху она приходится на самый дальний от пальца
          угол, а нажимают её чаще всего остального. */}
      <Link className="btn btn-primary only-wide-inline" href={`/${slug}/dashboard/calendar`}>
        <Icon name="plus" className="ico-18" />
        <span>{t.home.newBooking}</span>
      </Link>

      <QuickSearch slug={slug} open={open} onOpenChange={setOpen} />
    </>
  );
}
