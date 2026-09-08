'use client';

/**
 * Боковая панель кабинета — по артборду `Main.dc.html`.
 *
 * Ширина 236px, бумажный фон, волосяная линия справа; знак сверху, пункты
 * без подписи группы, «Рабочее место» под подписью, и внизу, прижатая к краю,
 * карточка аккаунта: аватар, имя, чем занимается заведение.
 *
 * Активный пункт — белая карточка с волосяной рамкой и тенью первого уровня,
 * а не полоса акцента: в этой системе акцентом отмечено занятое время, и
 * второй смысл у той же краски сделал бы календарь нечитаемым.
 *
 * Только для широкого экрана (`lg`) — на узком её место занимает нижняя
 * панель вкладок.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

import { navGroupLabels, type NavItem } from '../types';
import { Icon } from './icon';
import { Wordmark } from './wordmark';
import { initials } from '@/lib/avatar';
import { AccountMenu } from './account-menu';

interface SidebarProps {
  items: NavItem[];
  /** Чем занимается заведение — вторая строка карточки аккаунта. */
  panelLabel: string;
  /** Имя, которое стоит в карточке аккаунта. */
  accountName: string;
  /** Пометка ADMIN рядом со знаком — только у панели платформы. */
  badge?: string;
  /** Ширина: у панели платформы она на восемь пикселей уже (артборд). */
  narrow?: boolean;
}

/** Инициалы для кружка: две буквы, как в макете. */
export function Sidebar({ items, panelLabel, accountName, badge, narrow }: SidebarProps) {
  const t = useT();
  const groupLabels = navGroupLabels(t);
  const pathname = usePathname();

  return (
    <aside className="sb" style={narrow ? { width: 228 } : undefined} aria-label={t.nav.mainNav}>
      <div className="row" style={{ padding: '4px 10px 18px', gap: 10, color: 'var(--ink)' }}>
        <Link href="/" aria-label="AMOLIE" style={{ display: 'inline-flex', color: 'inherit' }}>
          <Wordmark height={15} />
        </Link>
        {badge ? (
          <span
            className="badge b-ink"
            style={{ height: 20, fontSize: 10.5, letterSpacing: '0.06em', padding: '0 6px' }}
          >
            {badge}
          </span>
        ) : null}
      </div>

      <nav className="col" style={{ gap: 2 }}>
        {items.map((item, index) => {
          const previous = index > 0 ? items[index - 1]!.group : null;
          const label = item.group !== previous ? groupLabels[item.group] : '';
          /* Точное совпадение, а не префикс: адрес «Главной» — начало всех
             остальных, и по префиксу подсвечивались бы сразу два пункта. */
          const active = pathname === item.href;

          return (
            <div key={item.key} className="contents">
              {label ? (
                <div className="nav-grp" style={index === 0 ? { paddingTop: 0 } : undefined}>
                  {label}
                </div>
              ) : null}

              <Link
                href={item.href}
                className={active ? 'nav is-on' : 'nav'}
                aria-current={active ? 'page' : undefined}
                {...(item.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                style={narrow ? { fontSize: 13.5, height: 34 } : undefined}
              >
                <Icon name={item.icon} className="ico-18" />
                <span>{item.label}</span>
                {item.badgeCount ? (
                  <span
                    className="cnt"
                    style={
                      item.badgeTone === 'amber'
                        ? { color: 'var(--amber)', background: 'var(--amber-tint)' }
                        : undefined
                    }
                    aria-label={fmt(t.nav.pendingBadge, { count: item.badgeCount })}
                  >
                    {item.badgeCount}
                  </span>
                ) : null}
              </Link>
            </div>
          );
        })}
      </nav>

      <div style={{ flex: 1 }} />

      {/* Карточка аккаунта прижата к нижнему краю: это не пункт меню, а
          ответ на вопрос «под кем я сижу», и в списке разделов ему не место.
          Шеврон справа — не украшение: за ним тема и выход. */}
      <AccountMenu
        accountName={accountName}
        panelLabel={panelLabel}
        initials={initials(accountName, 'A')}
      />
    </aside>
  );
}
