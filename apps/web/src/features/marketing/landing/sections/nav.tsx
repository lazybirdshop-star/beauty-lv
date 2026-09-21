'use client';

/**
 * 01 · Шапка.
 *
 * Полоса красится под то, что под ней: на бумаге она чернильная, над тёмными
 * секциями — бумажная. Иначе знак и ссылки пропадали бы ровно там, где
 * читатель дольше всего смотрит на страницу, — над первым экраном «Проблемы»
 * и над финальным призывом.
 *
 * Меню телефона — непрозрачный лист на весь экран под полосой. Страница под
 * ним не прокручивается, пока он открыт: иначе палец, листающий меню, уводил
 * бы страницу, и после закрытия читатель оказывался в чужом месте.
 *
 * Пункт раздела, в котором читатель сейчас, подсвечен (`aria-current`):
 * после перехода по якорю видно, куда именно привела ссылка.
 */
import type { Locale } from '@/lib/i18n/config';
import type { Messages } from '@/lib/i18n/messages';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { LocaleSwitch } from '../components/locale-switch';
import { Horizontal } from '../components/logo';

export const NAV_LINKS = [
  { href: '#product', key: 'navProduct' },
  { href: '#solo', key: 'navSolo' },
  { href: '#salons', key: 'navSalons' },
  { href: '#pricing', key: 'navPricing' },
  { href: '#faq', key: 'navFaq' },
] as const;

export function Nav({ t, locale }: { t: Messages['marketing']; locale: Locale }) {
  const [scrolled, setScrolled] = useState(false);
  const [dark, setDark] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const bar = useRef<HTMLElement>(null);

  useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;
      setScrolled(window.scrollY > 8);

      /* Тон полосы решает не номер секции, а то, что физически лежит под её
         серединой: секции разной высоты, и считать по порядку значило бы
         перекрашиваться не там, где видно.
         Считаются только чернильные секции во всю ширину и подвал. Чёрная
         карточка тарифа «Команда» тоже помечена `on-ink`, но она карточка:
         полоса над ней перекрашивалась в бумажную посреди светлой секции —
         ровно там, где под ней ничего тёмного нет. */
      const middle = (bar.current?.offsetHeight ?? 68) / 2;
      const inks = document.querySelectorAll<HTMLElement>('section.on-ink, footer.on-ink');
      let over = false;
      for (const ink of inks) {
        const rect = ink.getBoundingClientRect();
        if (rect.top <= middle && rect.bottom > middle) {
          over = true;
          break;
        }
      }
      setDark(over);

      /* Текущий раздел — последний, чья верхняя кромка ушла под полосу.
         Ниже последнего раздела (подвал) ни один пункт не горит. */
      const line = (bar.current?.offsetHeight ?? 68) + 24;
      let here: string | null = null;
      for (const link of NAV_LINKS) {
        const rect = document.querySelector(link.href)?.getBoundingClientRect();
        if (rect && rect.top <= line && rect.bottom > line) here = link.href;
      }
      setCurrent(here);
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const close = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      root.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen, close]);

  const classes = ['nav', scrolled || menuOpen ? 'is-scrolled' : '', dark ? 'is-dark' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <header className={classes} ref={bar}>
      <div className="container nav__inner">
        <a className="nav__logo" href="#top" aria-label={t.navBackToTop}>
          <Horizontal />
        </a>

        <nav className="nav__links" aria-label={t.navPrimary}>
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              aria-current={current === link.href ? 'true' : undefined}
            >
              {t[link.key]}
            </a>
          ))}
        </nav>

        <div className="nav__actions">
          <LocaleSwitch active={locale} className="nav__lang" label={t.language} />
          <Link className="btn btn--ghost" href="/login">
            {t.logIn}
          </Link>
          <Link className="btn btn--primary" href="/register" data-magnetic>
            {t.signUp}
          </Link>
          <button
            className="nav__toggle"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? t.navCloseMenu : t.navOpenMenu}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg
              className="ico-menu"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
            <svg
              className="ico-close"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>

      <div id="mobile-menu" className="nav__mobile" hidden={!menuOpen}>
        {NAV_LINKS.map((link) => (
          <a key={link.href} href={link.href} onClick={close}>
            {t[link.key]}
          </a>
        ))}
        <Link href="/login" onClick={close}>
          {t.logIn}
        </Link>
        <Link className="btn btn--primary btn--lg" href="/register" onClick={close}>
          {t.signUp}
        </Link>
        {/* На телефоне язык уходит из полосы в меню: в полосе для него нет
            места рядом со знаком и кнопкой, а спрятать его совсем нельзя —
            половина посетителей приходит не на своём языке. */}
        <LocaleSwitch active={locale} className="nav__lang" label={t.language} />
      </div>
    </header>
  );
}
