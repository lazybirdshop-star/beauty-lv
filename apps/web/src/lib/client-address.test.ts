import { describe, expect, it } from 'vitest';

import { clientAddress } from './client-address';

describe('clientAddress', () => {
  it('предпочитает x-real-ip присланной цепочке', () => {
    const headers = new Headers({
      'x-real-ip': '203.0.113.7',
      'x-forwarded-for': '1.2.3.4, 203.0.113.7',
    });

    expect(clientAddress(headers)).toBe('203.0.113.7');
  });

  it('берёт из цепочки последний хоп, а не первый', () => {
    /* Первые элементы мог сочинить сам вызывающий: если платформа к
       присланному заголовку дописывает реальный адрес, то первый элемент
       выбирает браузер. Под подписью хопа это означало бы лимитер, который
       подбирающий пароли обнуляет строкой в заголовке. */
    const headers = new Headers({ 'x-forwarded-for': '9.9.9.9, 203.0.113.7' });

    expect(clientAddress(headers)).toBe('203.0.113.7');
  });

  it('чистит пробелы и пустые элементы', () => {
    const headers = new Headers({ 'x-forwarded-for': '9.9.9.9, , 203.0.113.7 ,' });

    expect(clientAddress(headers)).toBe('203.0.113.7');
  });

  it('без заголовков не выдумывает адрес', () => {
    // Пусто — значит заголовок не ставится вовсе, и API считает запрос по
    // адресу самого BFF: грубее, но честно.
    expect(clientAddress(new Headers())).toBeNull();
  });
});
