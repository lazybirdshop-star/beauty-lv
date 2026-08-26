import { describe, expect, it } from 'vitest';

import { returnTarget } from './auth-return-target';

describe('returnTarget', () => {
  it('возвращает на адрес, с которого развернула охрана', () => {
    expect(returnTarget('/admin/registration-requests', '/admin')).toBe(
      '/admin/registration-requests',
    );
    expect(returnTarget('/admin', '/admin')).toBe('/admin');
    expect(returnTarget('/salon-a/dashboard/bookings', '/salon-a/dashboard')).toBe(
      '/salon-a/dashboard/bookings',
    );
  });

  it('без `next` ведёт домой, а без дома — на лендинг', () => {
    expect(returnTarget(null, '/admin')).toBe('/admin');
    expect(returnTarget(null, null)).toBe('/');
    expect(returnTarget('/admin', null)).toBe('/');
  });

  it('не пускает за пределы домашней области — там охрана развернёт снова', () => {
    expect(returnTarget('/admin', '/salon-a/dashboard')).toBe('/salon-a/dashboard');
    expect(returnTarget('/salon-b/dashboard', '/salon-a/dashboard')).toBe('/salon-a/dashboard');
    /* Приставка совпадает, а раздел чужой: `/admin-tools` — не `/admin`. */
    expect(returnTarget('/admin-tools', '/admin')).toBe('/admin');
  });

  it('отбрасывает чужой источник в параметре', () => {
    expect(returnTarget('//evil.example/admin', '/admin')).toBe('/admin');
    expect(returnTarget('https://evil.example/admin', '/admin')).toBe('/admin');
    expect(returnTarget('/\\evil.example', '/admin')).toBe('/admin');
  });

  it('хвост запроса едет вместе с адресом', () => {
    expect(returnTarget('/admin/logs?page=2', '/admin')).toBe('/admin/logs?page=2');
  });
});
