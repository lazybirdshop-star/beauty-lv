// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api-error';
import { ru } from '@/lib/i18n/messages';

import type { Service, ServiceCategory } from '../types';
import { CategoryFormSheet } from './category-form-sheet';
import { ServiceFormSheet } from './service-form-sheet';

/**
 * Отказ обязан остаться в шторке.
 *
 * Обе формы звали `await onSubmit(...)` без разбора: сбой уходил в
 * необработанное отклонение, `onSuccess` не срабатывал, шторка оставалась
 * открытой — и молчала. Кнопка возвращалась из «Сохраняем…» в «Сохранить»,
 * то есть выглядела ровно так, будто по ней не попали. Мастер жала снова, и
 * при создании услуги каждое нажатие заводило дубликат.
 *
 * Проверяется не разметка, а обещание: после неудачи человек видит причину и
 * не теряет введённое.
 */

vi.mock('../api', () => ({
  listServiceAddons: () => Promise.resolve([]),
}));

/* Тумблер Radix меряет себя `ResizeObserver`, которого в jsdom нет. */
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const CATEGORY: ServiceCategory = {
  id: 'cat-1',
  organizationId: 'org-1',
  name: 'Ногти',
  sortOrder: 0,
  isActive: true,
  serviceCount: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const SERVICE: Service = {
  id: 'svc-1',
  organizationId: 'org-1',
  categoryId: 'cat-1',
  name: 'Маникюр',
  description: null,
  durationMinutes: 60,
  bufferAfterMinutes: 0,
  priceAmount: 3000,
  priceCurrency: 'EUR',
  priceType: 'fixed',
  color: null,
  imageUrl: null,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

/* Форма услуги догружает цепочку допов своим запросом — ей нужен клиент. */
function withQuery(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}

afterEach(cleanup);

describe('Шторка услуги', () => {
  it('после отказа сервера показывает причину и остаётся открытой', async () => {
    const onSubmit = vi.fn(() => Promise.reject(new ApiError(500, 'Internal Server Error')));

    render(
      withQuery(
        <ServiceFormSheet
          open
          onOpenChange={() => {}}
          slug="masha"
          service={SERVICE}
          categories={[CATEGORY]}
          allServices={[SERVICE]}
          onSubmit={onSubmit}
          submitting={false}
        />,
      ),
    );

    fireEvent.submit(screen.getByRole('button', { name: ru.common.save }).closest('form')!);

    expect((await screen.findByRole('alert')).textContent).toContain(ru.common.saveFailed);
    // Введённое на месте: форма не сбросилась и не закрылась.
    expect(screen.getByDisplayValue('Маникюр')).toBeTruthy();
  });

  it('на повторной удачной отправке убирает прежнюю ошибку', async () => {
    const onSubmit = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new ApiError(500, 'Internal Server Error'))
      .mockResolvedValueOnce(undefined);

    render(
      withQuery(
        <ServiceFormSheet
          open
          onOpenChange={() => {}}
          slug="masha"
          service={SERVICE}
          categories={[CATEGORY]}
          allServices={[SERVICE]}
          onSubmit={onSubmit}
          submitting={false}
        />,
      ),
    );

    const form = screen.getByRole('button', { name: ru.common.save }).closest('form')!;
    fireEvent.submit(form);
    expect(await screen.findByRole('alert')).toBeTruthy();

    fireEvent.submit(form);
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });
});

describe('Шторка категории', () => {
  it('после отказа сервера показывает причину', async () => {
    const onSubmit = vi.fn(() => Promise.reject(new ApiError(500, 'Internal Server Error')));

    render(
      <CategoryFormSheet
        open
        onOpenChange={() => {}}
        category={CATEGORY}
        onSubmit={onSubmit}
        submitting={false}
      />,
    );

    fireEvent.submit(screen.getByRole('button', { name: ru.common.save }).closest('form')!);

    expect((await screen.findByRole('alert')).textContent).toContain(ru.common.saveFailed);
    expect(screen.getByDisplayValue('Ногти')).toBeTruthy();
  });
});
