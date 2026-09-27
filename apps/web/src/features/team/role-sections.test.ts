import { describe, expect, it } from 'vitest';

import { ru } from '@/lib/i18n/messages';

import { roleSections } from './role-sections';

const keys = (role: 'admin' | 'master', allowed: boolean) =>
  roleSections(ru, role)
    .filter((section) => section.allowed === allowed)
    .map((section) => section.key);

describe('roleSections', () => {
  /* Администратор салона получает кабинет заведения целиком — и записи, и
     телефоны клиентов, и доход. Примерка существует ровно затем, чтобы
     владелица увидела это до отправки приглашения, а не после. */
  it('администратору открыты записи, клиенты и доход заведения', () => {
    expect(keys('admin', true)).toEqual(expect.arrayContaining(['bookings', 'clients', 'finance']));
  });

  it('наёмному мастеру закрыты доход заведения и команда', () => {
    expect(keys('master', false)).toEqual(expect.arrayContaining(['finance', 'team']));
    expect(keys('master', true)).toContain('calendar');
  });

  /* «Выплаты» есть у наёмного мастера и нет у владелицы: эталоном её меню
     быть не может, иначе примерка молчит о разделе, который человек получит. */
  it('называет раздел, которого у владелицы нет', () => {
    expect(keys('master', true)).toContain('payouts');
  });

  it('«Сегодня» в примерке не участвует', () => {
    expect(roleSections(ru, 'admin').map((section) => section.key)).not.toContain('home');
  });

  it('у мастера прав меньше, чем у администратора', () => {
    expect(keys('master', true).length).toBeLessThan(keys('admin', true).length);
  });

  /* Набор плиток один на обе роли: при переключении меняются погашенные, а не
     длина списка, иначе роли не сравнить. */
  it('набор разделов не зависит от выбранной роли', () => {
    const admin = roleSections(ru, 'admin');
    const master = roleSections(ru, 'master');
    expect(admin.map((s) => s.key)).toEqual(master.map((s) => s.key));
    expect(admin.every((section) => section.label.length > 0)).toBe(true);
  });
});
