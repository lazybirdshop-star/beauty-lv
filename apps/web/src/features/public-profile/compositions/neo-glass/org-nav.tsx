'use client';

import { House, Tag, UserCircle, type Icon } from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import type { NavProps } from '../../contracts/sections';
import { cascade, FOCUS_RING_INSET } from './ui';
import { SPRINGS } from './motion';

/**
 * Навигация мира Neo Glass (§9 «Форма», §12): парящая стеклянная капсула во
 * всю ширину, внутри — пункты «иконка + текст». Активный отмечен стеклянной
 * пилюлей `--nav-active-bg` (`accent-soft`) со световой кромкой, а его глиф
 * меняет начертание Regular → Fill: включённость читается плотностью, а не
 * вторым акцентным цветом (§9 «Иконки»).
 *
 * Пилюля перетекает между пунктами layout-анимацией на пружине контрола
 * (400/30) — единственное место мира, где пружина считается по-настоящему,
 * а не фолбэчной кривой: перетекание между двумя произвольными позициями
 * CSS-переходом не выражается. Компонент навигации переживает клиентские
 * переходы внутри сегмента (он живёт в `Shell`), поэтому `layoutId`
 * связывает старую и новую позицию одного и того же объекта.
 *
 * Первый кадр анимации не играет: `motion` анимирует layout только при
 * смене позиции, а на маунте пилюля уже стоит там, где нужно.
 */
const ICONS: Record<'home' | 'prices' | 'contacts', Icon> = {
  home: House,
  prices: Tag,
  contacts: UserCircle,
};

export function OrgNav({ org }: NavProps) {
  const t = useT();
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const base = `/${org.slug}`;

  const items = [
    { key: 'home' as const, href: base, label: t.nav.home },
    ...(org.showPricesSection
      ? [{ key: 'prices' as const, href: `${base}/prices`, label: t.publicPage.servicesShort }]
      : []),
    ...(org.showContactsSection
      ? [{ key: 'contacts' as const, href: `${base}/contacts`, label: t.publicPage.contacts }]
      : []),
  ];

  return (
    <nav
      aria-label={t.publicPage.mainNav}
      className="anim-neo-glass-materialize neo-glass-pane rounded-full p-1.5"
      style={cascade(3)}
    >
      <div className="flex">
        {items.map((item) => {
          const isActive = pathname === item.href;
          const Glyph = ICONS[item.key];
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'neo-glass-action relative flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-2 text-[13px] font-medium',
                FOCUS_RING_INSET,
                isActive ? 'text-ink' : 'text-ink-soft hover:text-ink',
              )}
            >
              {isActive ? (
                /* Пилюля — отдельный слой под содержимым: перетекая, она не
                   тащит за собой подпись и глиф. */
                <motion.span
                  aria-hidden="true"
                  layoutId="neo-glass-nav-pill"
                  transition={reduced ? { duration: 0 } : SPRINGS.press}
                  className="absolute inset-0 rounded-full border border-[var(--surface-edge)] bg-[var(--nav-active-bg)]"
                />
              ) : null}
              <Glyph
                size={17}
                weight={isActive ? 'fill' : 'regular'}
                aria-hidden="true"
                className="relative shrink-0"
              />
              <span className="relative truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
