// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ru } from '@/lib/i18n/messages';

import { getMasterNavItems } from '../nav-config';
import { BottomTabBar } from './bottom-tab-bar';

/**
 * Нижняя панель телефона.
 *
 * Она берёт себе первые четыре пункта навигации, остальные прячет в «Ещё» —
 * это и есть её единственное правило, и нарушить его легче всего добавлением
 * нового раздела. Поэтому проверяется не вёрстка, а договор: сколько вкладок
 * видно, где оказывается пятый раздел, и остаётся ли активным пункт, ушедший
 * в шторку, — иначе мастер, стоя в «Настройках», видела бы панель, на которой
 * она нигде.
 *
 * Счётчик ждущих записей живёт на вкладке, а не рядом с ней: вкладка едва шире
 * слова, и метка в той же строке сдвинула бы подпись с центра.
 */

const SLUG = 'anna';
const BASE = `/${SLUG}/dashboard`;

let pathname = BASE;

vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

afterEach(() => {
  pathname = BASE;
  cleanup();
});

function show(at = BASE, badgeCount = 0) {
  pathname = at;
  const items = getMasterNavItems(SLUG, ru).map((item) =>
    item.key === 'bookings' ? { ...item, badgeCount } : item,
  );
  render(<BottomTabBar items={items} />);
  return items;
}

/** Ссылки самой панели, без содержимого шторки «Ещё». */
function tabs() {
  return within(screen.getByRole('navigation', { name: ru.nav.mainNav })).getAllByRole('link');
}

describe('BottomTabBar — четыре вкладки и «Ещё»', () => {
  it('видно ровно четыре раздела плюс кнопку «Ещё»', () => {
    show();

    expect(tabs()).toHaveLength(4);
    expect(screen.getByRole('button', { name: ru.nav.more })).toBeTruthy();
  });

  it('вкладки — те четыре экрана, которые мастер открывает каждый день', () => {
    show();

    expect(tabs().map((link) => link.getAttribute('href'))).toEqual([
      BASE,
      `${BASE}/calendar`,
      `${BASE}/bookings`,
      `${BASE}/clients`,
    ]);
  });

  it('пятый и дальше разделы живут в шторке «Ещё»', () => {
    show();

    fireEvent.click(screen.getByRole('button', { name: ru.nav.more }));

    const sheet = screen.getByRole('dialog');
    const hidden = within(sheet)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));
    expect(hidden).toContain(`${BASE}/services`);
    expect(hidden).toContain(`${BASE}/settings`);
  });
});

describe('BottomTabBar — где мастер сейчас', () => {
  it('текущая вкладка помечена для читалки, а не только полоской', () => {
    show(`${BASE}/clients`);

    const current = tabs().filter((link) => link.getAttribute('aria-current') === 'page');
    expect(current).toHaveLength(1);
    expect(current[0]!.getAttribute('href')).toBe(`${BASE}/clients`);
  });

  it('на неизвестном подпути ни одна вкладка не притворяется текущей', () => {
    // Лучше не отметить ничего, чем отметить не то: панель — карта, а не догадка.
    show(`${BASE}/pricing`);

    expect(tabs().some((link) => link.getAttribute('aria-current') === 'page')).toBe(false);
  });

  it('раздел из «Ещё» подсвечивает саму кнопку «Ещё»', () => {
    // Иначе мастер, стоя в «Настройках», видит панель, на которой её нигде нет.
    show(`${BASE}/settings`);

    const more = screen.getByRole('button', { name: ru.nav.more });
    expect(more.className).toContain('text-ink');
    expect(more.className).not.toContain('text-ink-faint');
  });
});

describe('BottomTabBar — счётчик ждущих записей', () => {
  it('без ждущих записей счётчика нет', () => {
    show(BASE, 0);

    expect(screen.queryByText(/Записей, ждущих подтверждения/)).toBeNull();
  });

  it('счётчик висит на вкладке «Записи», а не где-то рядом', () => {
    show(BASE, 2);

    const bookings = tabs().find((link) => link.getAttribute('href') === `${BASE}/bookings`)!;
    expect(within(bookings).getByText('2')).toBeTruthy();
    expect(within(bookings).getByText(/Записей, ждущих подтверждения: 2/)).toBeTruthy();
  });

  it('счётчик не появляется на других вкладках', () => {
    show(BASE, 2);

    const clients = tabs().find((link) => link.getAttribute('href') === `${BASE}/clients`)!;
    expect(within(clients).queryByText('2')).toBeNull();
  });
});

describe('BottomTabBar — шторка «Ещё»', () => {
  it('переход из шторки её закрывает — иначе она осталась бы поверх нового экрана', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: ru.nav.more }));

    const link = within(screen.getByRole('dialog')).getAllByRole('link')[0]!;
    fireEvent.click(link);

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
