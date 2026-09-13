'use client';

/**
 * Боковая панель кабинета — прототип «Кабинет 2026», блок `.rail`.
 *
 * Сверху знак и заведение: квадратный знак с росчерком «a», рядом AMOLIE
 * разрядкой, под ними название заведения и строка о том, что это за
 * заведение. Ниже — пункты разделов: прямоугольные пилюли 12 px, активная
 * поднимается белым листом с тенью и волосяной рамкой. Группа «Рабочее
 * место» отделяется подписью в капсе, без линии — линия делила бы панель на
 * два предмета, а она один.
 *
 * У нижнего края — карточка аккаунта: портрет, имя и роль. Она стоит внизу,
 * а не вверху, потому что вверху место заведения: кабинет открыт от лица
 * заведения, а человек за ним — подпись под этим фактом. За карточкой тема и
 * выход.
 *
 * Только для широкого экрана (`lg`) — на узком её место занимают верхняя
 * строка экрана и нижняя панель вкладок.
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
  /** Название заведения — первая строка блока под знаком. */
  panelLabel: string;
  /** Что это за заведение: «Соло», «Салон · 5 человек», «Панель платформы». */
  planLabel: string;
  /** Имя в карточке аккаунта. */
  accountName: string;
  /** Роль под именем: «Владелец салона», «Мастер в салоне». */
  roleLabel: string;
  /** Пометка ADMIN в карточке аккаунта — только у панели платформы. */
  badge?: string;
}

export function Sidebar({
  items,
  panelLabel,
  planLabel,
  accountName,
  roleLabel,
  badge,
}: SidebarProps) {
  const t = useT();
  const groupLabels = navGroupLabels(t);
  const pathname = usePathname();

  return (
    <aside className="sb" aria-label={t.nav.mainNav}>
      <div className="sb__brand">
        <span className="sb__mark" aria-hidden="true">
          a
        </span>
        <b className="sb__wordmark">AMOLIE</b>
      </div>

      <div className="sb__org">
        <div className="sb__org-name">{panelLabel}</div>
        <div className="sb__org-plan">{planLabel}</div>
      </div>

      <nav className="sb__nav">
        {items.map((item, index) => {
          const previous = index > 0 ? items[index - 1]!.group : null;
          const label = item.group !== previous ? groupLabels[item.group] : '';
          /* Точное совпадение, а не префикс: адрес «Главной» — начало всех
             остальных, и по префиксу подсвечивались бы сразу два пункта. */
          const active = isNavActive(item, pathname);

          return (
            <div key={item.key} className="contents">
              {label ? <div className="nav-grp">{label}</div> : null}

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
                    className={
                      item.badgeTone === 'amber' ? 'nav__count tnum is-amber' : 'nav__count tnum'
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

      <div className="sb__foot">
        <AccountMenu
          accountName={accountName}
          panelLabel={roleLabel}
          badge={badge}
          placement="up"
        />
      </div>
    </aside>
  );
}
