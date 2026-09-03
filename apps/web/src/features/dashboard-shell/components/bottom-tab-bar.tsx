'use client';

/**
 * Нижняя панель вкладок — по `bottomNav` из макета.
 *
 * Пять вкладок: четыре самых частых экрана и «Ещё». Активная отмечена
 * пилюлей под значком, а не краской подписи: на маленьком значке цвет читается
 * хуже, чем форма, а пилюля видна боковым зрением.
 *
 * Переполнение уезжает в шторку «Ещё» — иначе на телефоне девять пунктов
 * превратились бы в девять нечитаемых значков в один ряд.
 */
import * as Dialog from '@radix-ui/react-dialog';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

import type { NavItem } from '../types';
import { Icon } from './icon';

/** Сколько пунктов становятся вкладками. Пятая — всегда «Ещё». */
const TABS = 4;

export function BottomTabBar({ items }: { items: NavItem[] }) {
  const t = useT();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const tabs = items.slice(0, TABS);
  const rest = items.slice(TABS);
  const restActive = rest.some((item) => pathname === item.href);

  return (
    <>
      <nav className="bnav" aria-label={t.nav.mainNav}>
        {tabs.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={active ? 'is-on' : undefined}
              aria-current={active ? 'page' : undefined}
            >
              <span className={active ? 'bnav__pill is-on' : 'bnav__pill'}>
                <Icon name={item.icon} className="ico-24" />
                {item.badgeCount ? (
                  <span
                    className="bnav__dot"
                    aria-label={fmt(t.nav.pendingBadge, { count: item.badgeCount })}
                  />
                ) : null}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}

        <Dialog.Root open={moreOpen} onOpenChange={setMoreOpen}>
          <Dialog.Trigger asChild>
            <button type="button" className={restActive ? 'is-on' : undefined}>
              <span className={restActive ? 'bnav__pill is-on' : 'bnav__pill'}>
                <Icon name="more" className="ico-24" />
              </span>
              <span>{t.nav.more}</span>
            </button>
          </Dialog.Trigger>

          <Dialog.Portal>
            <Dialog.Overlay className="sheet-overlay" />
            <Dialog.Content className="amolie-app sheet" aria-describedby={undefined}>
              <Dialog.Title className="t-section" style={{ padding: '18px 16px 10px' }}>
                {t.nav.more}
              </Dialog.Title>
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
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </nav>
    </>
  );
}
