'use client';

/**
 * Боковая панель кабинета — Design System V2, handoff §5.
 *
 * 220 px на цвете стола, без линии справа и без заливки. Сверху — карточка
 * аккаунта (портрет, имя, заведение), а не знак: человек, под кем открыт
 * кабинет, важнее логотипа, который и так стоит в заголовке вкладки. Пункты
 * — пилюли 44 px; активный поднимается белой пилюлей с тенью и несёт розовую
 * точку справа (правило 03: выбранное поднимается, никогда рамка и никогда
 * заливка акцентом). Группа «Рабочее место» — после волосяной линии, тихой
 * подписью без капса. «Выйти» — в карточке аккаунта, за шевроном, и только
 * там: второй такой же пункт у нижнего края панели удваивал одно действие.
 *
 * Только для широкого экрана (`lg`) — на узком её место занимает нижняя
 * панель вкладок.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

import { navGroupLabels, type NavItem } from '../types';
import { isNavActive } from '../nav-active';
import { AccountMenu } from './account-menu';
import { Icon } from './icon';

interface SidebarProps {
  items: NavItem[];
  /** Чем занимается заведение — вторая строка карточки аккаунта. */
  panelLabel: string;
  /** Имя, которое стоит в карточке аккаунта. */
  accountName: string;
  /** Пометка ADMIN в карточке аккаунта — только у панели платформы. */
  badge?: string;
}

export function Sidebar({ items, panelLabel, accountName, badge }: SidebarProps) {
  const t = useT();
  const groupLabels = navGroupLabels(t);
  const pathname = usePathname();

  return (
    <aside className="sb" aria-label={t.nav.mainNav}>
      <AccountMenu accountName={accountName} panelLabel={panelLabel} badge={badge} />

      <nav className="sb__nav">
        {items.map((item, index) => {
          const previous = index > 0 ? items[index - 1]!.group : null;
          const label = item.group !== previous ? groupLabels[item.group] : '';
          /* Точное совпадение, а не префикс: адрес «Главной» — начало всех
             остальных, и по префиксу подсвечивались бы сразу два пункта. */
          const active = isNavActive(item, pathname);

          return (
            <div key={item.key} className="contents">
              {label ? (
                <>
                  <hr className="rule sb__rule" />
                  <div className="nav-grp type-meta">{label}</div>
                </>
              ) : null}

              <Link
                href={item.href}
                className={active ? 'nav is-on' : 'nav'}
                aria-current={active ? 'page' : undefined}
                {...(item.external ? { target: '_blank', rel: 'noreferrer' } : {})}
              >
                <Icon name={item.icon} />
                <span className="nav__label">{item.label}</span>
                {item.badgeCount ? (
                  <span
                    className="nav__count tnum"
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
    </aside>
  );
}
