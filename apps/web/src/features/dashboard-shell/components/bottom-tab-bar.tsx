'use client';

/**
 * Нижняя панель вкладок — Design System V2, handoff §5.
 *
 * Вкладки прибиты по ключу, а не по порядку списка (approved R-9): у мастера
 * это всегда Сегодня · Календарь · Клиенты · Ещё, и новый пункт меню никогда
 * не вытолкнет «Клиентов» молча. Панель платформы вкладок по ключу не имеет
 * — там первые четыре по порядку, как и было.
 *
 * Активная вкладка — насыщенное начертание подписи и розовая точка под ней,
 * никогда залитая пилюля. Счётчик — числом на значке: «3 ждут ответа» читается
 * и точкой, но число отвечает на вопрос «сколько» без перехода.
 *
 * Переполнение уезжает в лист «Ещё» — иначе на телефоне девять пунктов
 * превратились бы в девять нечитаемых значков в один ряд.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { Sheet } from '@/components/ui/sheet';
import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

import type { NavItem } from '../types';
import { isNavActive } from '../nav-active';
import { AccountRows } from './account-rows';
import { Icon } from './icon';

/** Сколько пунктов становятся вкладками, когда ключи не названы. */
const TABS = 4;

export function BottomTabBar({ items, pinned }: { items: NavItem[]; pinned?: string[] }) {
  const t = useT();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const tabs = pinned
    ? pinned.flatMap((key) => items.filter((item) => item.key === key))
    : items.slice(0, TABS);
  const rest = items.filter((item) => !tabs.includes(item));
  const restActive = rest.some((item) => isNavActive(item, pathname));

  return (
    <>
      <nav className="bnav" aria-label={t.nav.mainNav}>
        {tabs.map((item) => {
          const active = isNavActive(item, pathname);
          return (
            <Link
              key={item.key}
              href={item.href}
              className={active ? 'bnav__tab is-on' : 'bnav__tab'}
              aria-current={active ? 'page' : undefined}
            >
              <span className="bnav__icon">
                <Icon name={item.icon} className="ico-24" />
                {item.badgeCount ? (
                  <span
                    className="bnav__count tnum"
                    aria-label={fmt(t.nav.pendingBadge, { count: item.badgeCount })}
                  >
                    {item.badgeCount}
                  </span>
                ) : null}
              </span>
              <span className="bnav__label">{item.label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          className={restActive ? 'bnav__tab is-on' : 'bnav__tab'}
          onClick={() => setMoreOpen(true)}
        >
          <span className="bnav__icon">
            <Icon name="more" className="ico-24" />
          </span>
          <span className="bnav__label">{t.nav.more}</span>
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen} title={t.nav.more} placement="bottom">
        <div className="menu-rows">
          {rest.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="mrow"
              onClick={() => setMoreOpen(false)}
              {...(item.external ? { target: '_blank', rel: 'noreferrer' } : {})}
            >
              <Icon name={item.icon} className="ico-18" />
              <span>{item.label}</span>
              <Icon name="chevR" className="ico-16 chev" />
            </Link>
          ))}

          {/* Тема и выход — здесь же: на телефоне боковой панели с
              карточкой аккаунта нет вовсе, и без этих двух строк выйти из
              кабинета с телефона было нельзя. */}
          <AccountRows onDone={() => setMoreOpen(false)} />
        </div>
      </Sheet>
    </>
  );
}
