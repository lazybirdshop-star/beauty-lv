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
  /*
   * ИЗВЕСТНЫЙ ДЕФЕКТ, зафиксированный тестом, а не одобренный им.
   *
   * Запасная ветка перебирает пункты в порядке меню, а первым в нём стоит
   * «Главная» с адресом самого кабинета — префиксом всех своих подпутей.
   * Значит она совпадает всегда, и запасная ветка не может вернуть ничего,
   * кроме главной: и вложенный экран раздела, и мастер первого запуска
   * (`/start`) подписываются «Главная / Что сегодня и как идут дела».
   *
   * Тесты ниже описывают то, что есть. Когда выбор подписи починят —
   * например, беря самое длинное совпадение, а не первое, — они упадут, и это
   * будет ровно тот момент, когда ожидания нужно переписать.
   */
  it('вложенный экран раздела подписывается «Главной», а не своим разделом', () => {
    expect(titleAt(`${BASE}/clients/some-id`)).toBe(ru.nav.home);
  });

  it('мастер первого запуска тоже подписан «Главной»', () => {
    expect(titleAt(`${BASE}/start`)).toBe(ru.nav.home);
    expect(titleAt(`${BASE}/pricing`)).toBe(ru.nav.home);
  });

  it('запасная ветка вообще не умеет вернуть не-главную', () => {
    // Свойство целиком, а не отдельным примером: пока «Главная» стоит первой,
    // любой неточный адрес кабинета получит её подпись.
    for (const path of ['/clients/1', '/services/new', '/start', '/anything']) {
      expect(titleAt(`${BASE}${path}`)).toBe(ru.nav.home);
    }
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
    ['/admin/users', ru.nav.users],
    ['/admin/invite-codes', ru.nav.inviteCodes],
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
