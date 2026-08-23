// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ru } from '@/lib/i18n/messages';

import type { Service } from '../types';
import { ServiceListItem } from './service-list-item';

/**
 * Строка услуги в каталоге кабинета.
 *
 * Проверяется то, ради чего строка существует: мастер обязана прочитать цену и
 * длительность, увидеть словами (а не только бледностью), что услуга спрятана
 * с витрины, и попасть в «изменить»/«удалить» так, чтобы одно не срабатывало
 * вместо другого. Иконки без подписи — половина списка, поэтому доступное имя
 * каждой кнопки проверяется отдельно.
 */

afterEach(cleanup);

const BASE: Service = {
  id: 'svc-1',
  organizationId: 'org-1',
  categoryId: null,
  name: 'Стрижка',
  description: null,
  durationMinutes: 60,
  bufferAfterMinutes: 0,
  priceAmount: 3500,
  priceCurrency: 'EUR',
  priceType: 'fixed',
  color: null,
  imageUrl: null,
  isActive: true,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

function show(service: Partial<Service> = {}) {
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  const { container } = render(
    <ServiceListItem service={{ ...BASE, ...service }} onEdit={onEdit} onDelete={onDelete} />,
  );
  return { onEdit, onDelete, container };
}

describe('ServiceListItem — что мастер читает', () => {
  it('называет услугу', () => {
    show();

    expect(screen.getByText('Стрижка')).toBeTruthy();
  });

  it('цена приходит в копейках и показывается деньгами', () => {
    show({ priceAmount: 3500 });

    expect(screen.getByText(/35[,.]00/)).toBeTruthy();
  });

  it('длительность стоит рядом с ценой — это одно решение мастера', () => {
    show({ durationMinutes: 90 });

    expect(screen.getByText(/90/)).toBeTruthy();
    expect(screen.getByText(new RegExp(ru.common.minutesShort))).toBeTruthy();
  });

  it('бесплатная услуга показывается нулём, а не пустым местом', () => {
    show({ priceAmount: 0 });

    expect(screen.getByText(/0[,.]00/)).toBeTruthy();
  });
});

describe('ServiceListItem — цена «от»', () => {
  it('приписка «от» появляется у плавающей цены', () => {
    show({ priceType: 'from', priceAmount: 5000 });

    expect(screen.getByText(new RegExp(`^${ru.common.from}\\s`))).toBeTruthy();
  });

  it('у фиксированной цены приписки нет — иначе она обещала бы торг', () => {
    show({ priceType: 'fixed', priceAmount: 5000 });

    expect(screen.queryByText(new RegExp(`^${ru.common.from}\\s`))).toBeNull();
  });
});

describe('ServiceListItem — спрятанная услуга', () => {
  it('скрытая с витрины услуга подписана словом, а не только бледностью', () => {
    // Цвет и прозрачность не имеют права быть единственным носителем статуса.
    show({ isActive: false });

    expect(screen.getByText(ru.services.hidden)).toBeTruthy();
  });

  it('активная услуга ничем не подписана — подпись значит «не как обычно»', () => {
    show({ isActive: true });

    expect(screen.queryByText(ru.services.hidden)).toBeNull();
  });
});

describe('ServiceListItem — цветная метка', () => {
  it('заданный цвет рисуется точкой и прячется от читалки', () => {
    const { container } = show({ color: '#e2568a' });

    const dot = container.querySelector('[aria-hidden="true"][style*="background"]');
    expect(dot).toBeTruthy();
  });

  it('без цвета точки нет — пустой кружок ничего не значил бы', () => {
    const { container } = show({ color: null });

    expect(container.querySelector('[style*="background-color"]')).toBeNull();
  });
});

describe('ServiceListItem — действия строки', () => {
  it('обе кнопки названы словами, хотя нарисованы значками', () => {
    show();

    expect(screen.getByRole('button', { name: ru.common.edit })).toBeTruthy();
    expect(screen.getByRole('button', { name: ru.common.delete })).toBeTruthy();
  });

  it('«изменить» зовёт только изменение', () => {
    const { onEdit, onDelete } = show();

    fireEvent.click(screen.getByRole('button', { name: ru.common.edit }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('«удалить» зовёт только удаление', () => {
    const { onEdit, onDelete } = show();

    fireEvent.click(screen.getByRole('button', { name: ru.common.delete }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('сама строка не кнопка — нажать её целиком нечем и незачем', () => {
    // Услуга открывается только явным «изменить»: строка-кнопка с двумя
    // кнопками внутри — вложенные контролы, которых вспомогательная техника
    // не разбирает.
    show();

    expect(screen.queryAllByRole('button')).toHaveLength(2);
  });
});
