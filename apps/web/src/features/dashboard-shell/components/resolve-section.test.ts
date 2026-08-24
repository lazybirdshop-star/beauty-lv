import { describe, expect, it } from 'vitest';

import { ru } from '@/lib/i18n/messages';

import { getAdminNavItems, getMasterNavItems } from '../nav-config';
import { resolveSection } from './dashboard-shell';

/**
 * Подпись шапки кабинета.
 *
 * Мастер читает её первой на каждом экране, и она же решает, какая вкладка
 * подсвечена. Совпадение обязано быть точным: адрес кабинета — префикс всех
 * своих подпутей, и поиск «начинается с» без предварительной точной проверки
 * назвал бы «Главной» вообще всё.
 *
 * Отдельно фиксируется поведение на адресах вне навигации (`/pricing`,
 * `/start`): они существуют — редиректом и мастером первого запуска — и
 * попадают в запасную ветку, а значит подписываются «Главной». Это здесь
 * записано не как одобрение, а чтобы изменение поведения было видно тестом.
 */

const SLUG = 'anna';
const BASE = `/${SLUG}/dashboard`;
const nav = getMasterNavItems(SLUG, ru);

function titleAt(pathname: string): string | undefined {
  return resolveSection(nav, pathname)?.label;
}

describe('resolveSection — точное совпадение решает', () => {
  it('корень кабинета — «Главная»', () => {
    expect(titleAt(BASE)).toBe(ru.nav.home);
  });

  it.each([
    ['/calendar', ru.nav.schedule],
    ['/bookings', ru.nav.bookings],
    ['/clients', ru.nav.clients],
    ['/services', ru.nav.services],
    ['/profile-page', ru.nav.page],
    ['/finance', ru.nav.finance],
    ['/settings', ru.nav.settings],
  ])('%s подписан своим разделом, а не «Главной»', (path, expected) => {
    // Без точной проверки все семь назывались бы «Главной»: каждый из этих
    // адресов начинается с адреса главной.
    expect(titleAt(`${BASE}${path}`)).toBe(expected);
  });

  it('каждый пункт навигации находит сам себя', () => {
    for (const item of nav) {
      expect(resolveSection(nav, item.href)?.key).toBe(item.key);
    }
  });
});

describe('resolveSection — адреса вне навигации', () => {
  it('подпуть раздела наследует его подпись', () => {
    /* Настоящая работа запасной ветки. Раньше её не было: перебор шёл по
       порядку меню, «Главная» стоит первой, а её адрес — префикс всех
       подпутей, поэтому побеждала всегда она. */
    expect(titleAt(`${BASE}/clients/some-id`)).toBe(ru.nav.clients);
    expect(titleAt(`${BASE}/services/new`)).toBe(ru.nav.services);
  });

  it('выигрывает самый длинный подходящий префикс, а не первый в меню', () => {
    expect(titleAt(`${BASE}/calendar/2026-08`)).toBe(ru.nav.schedule);
  });

  it('адрес, которого нет в навигации, остаётся без подписи раздела', () => {
    /* `/start` — мастер первого запуска: он не пункт меню и не подпуть
       раздела, и притворяться «Главной» ему незачем — свой заголовок он
       задаёт сам. */
    expect(resolveSection(nav, `${BASE}/start`)).toBeUndefined();
  });

  it('корень кабинета не считается подпутём самого себя', () => {
    // Точное совпадение уже отработало выше; запасная ветка не должна
    // находить его второй раз и по-другому.
    expect(resolveSection(nav, BASE)?.key).toBe('home');
  });

  it('похожий, но чужой префикс не совпадает', () => {
    // «/services-archive» не подпуть «/services»: граница проверяется явно.
    expect(resolveSection(nav, `${BASE}/services-archive`)).toBeUndefined();
  });

  it('чужой кабинет своим разделом не подписывается', () => {
    expect(resolveSection(nav, '/someone-else/dashboard/clients')).toBeUndefined();
  });

  it('адрес вне кабинета не совпадает ни с чем', () => {
    expect(resolveSection(nav, '/login')).toBeUndefined();
    expect(resolveSection(nav, '/')).toBeUndefined();
  });
});

describe('resolveSection — панель платформы', () => {
  const admin = getAdminNavItems(ru);

  it('корень админки — «Главная»', () => {
    expect(resolveSection(admin, '/admin')?.label).toBe(ru.nav.home);
  });

  it.each([
    ['/admin/masters', ru.nav.masters],
    ['/admin/organizations', ru.nav.organizations],
    ['/admin/users', ru.nav.users],
    ['/admin/registration-requests', ru.nav.registrationRequests],
    ['/admin/subscriptions', ru.nav.subscriptions],
    ['/admin/logs', ru.nav.logs],
    ['/admin/settings', ru.nav.platformSettings],
  ])('%s подписан своим разделом', (path, expected) => {
    expect(resolveSection(admin, path)?.label).toBe(expected);
  });

  it('одна и та же функция обслуживает обе панели', () => {
    // Разные только `nav` и подпись панели — это и есть весь общий каркас.
    expect(resolveSection(admin, `${BASE}/clients`)).toBeUndefined();
    expect(resolveSection(nav, '/admin/users')).toBeUndefined();
  });
});
