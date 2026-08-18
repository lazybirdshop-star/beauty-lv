/* Плавающая пилюля шапки: знак, язык и вход.

   Ссылок на разделы в ней нет по решению владельца: страница читается
   подряд, и оглавление к пяти экранам — лишняя работа для читателя, а не
   помощь. Освободившееся место отдано языку, который теперь стоит здесь на
   всех ширинах, включая телефон.

   Переключатель стоит именно тут, а не отдельной полосой сверху: у мира один
   плавающий элемент управления, и второй, приклеенный к краю, разрушил бы
   первый экран, который по HERO-01 обязан уместиться целиком. */
import type { Locale } from '@/lib/i18n/config';
import type { Messages } from '@/lib/i18n/messages';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { LocaleSwitch } from '../components/locale-switch';
import { Wordmark } from '../components/logo';

export function Nav({ t, locale }: { t: Messages['marketing']; locale: Locale }) {
  /* Past the first screen the bar densifies: same glass, more ink — so it
     stays legible over photography instead of borrowing contrast from it. */
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setScrolled(window.scrollY > 24));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <header className={`nav${scrolled ? ' is-scrolled' : ''}`}>
      <a className="nav__brand" href="#top" aria-label={t.navBackToTop}>
        <Wordmark className="nav__mark" />
      </a>

      <LocaleSwitch active={locale} className="nav__lang" label={t.language} />

      <div className="nav__account">
        <Link className="nav__login" href="/login">
          {t.logIn}
        </Link>
        <Link className="btn btn--solid nav__cta" href="/register">
          {t.signUp}
        </Link>
      </div>
    </header>
  );
}
