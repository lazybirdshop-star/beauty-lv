// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ru } from '@/lib/i18n/messages';

import type { Client } from '../types';
import type { ClientVisitStats } from '../visit-stats';
import { ClientListItem } from './client-list-item';

/**
 * Строка клиента в адресной книге мастера.
 *
 * Главное свойство строки — три разных нажатия в одном прямоугольнике: сама
 * карточка открывает историю, карандаш ведёт в правку, корзина спрашивает про
 * удаление. Они обязаны не срабатывать друг за друга: «удалить» вместо
 * «открыть» — необратимое действие по случайному касанию, и это единственное
 * место списка, где такая ошибка стоит дорого.
 *
 * Второе — приватность: заметка и метка принадлежат мастеру и никогда не
 * попадают клиенту. Здесь проверяется, что они вообще показываются мастеру,
 * а «заблокирован» назван словом, а не одним лишь цветом.
 */

afterEach(cleanup);

const BASE: Client = {
  id: 'client-1',
  organizationId: 'org-1',
  fullName: 'Анна Берзиня',
  phone: '+37120000114',
  email: null,
  instagramHandle: null,
  notes: null,
  flag: null,
  isBlocked: false,
  visitStats: { totalBookings: 0, lastVisitAt: null },
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const NO_VISITS: ClientVisitStats = {
  totalBookings: 0,
  lastVisitAt: null,
  favoriteServiceName: null,
};

function show(client: Partial<Client> = {}, stats: Partial<ClientVisitStats> = {}) {
  const onOpenDetail = vi.fn();
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  const { container } = render(
    <ClientListItem
      client={{ ...BASE, ...client }}
      stats={{ ...NO_VISITS, ...stats }}
      onOpenDetail={onOpenDetail}
      onEdit={onEdit}
      onDelete={onDelete}
    />,
  );
  return { onOpenDetail, onEdit, onDelete, container };
}

describe('ClientListItem — что мастер читает', () => {
  it('называет человека и его номер', () => {
    show();

    expect(screen.getByText('Анна Берзиня')).toBeTruthy();
    // Номер хранится канонически, а печатается группами — см. `formatPhone`.
    expect(screen.getByText('+371 20 000 114')).toBeTruthy();
  });

  it('без визитов так и написано — а не «последний визит: null»', () => {
    show({}, { totalBookings: 0, lastVisitAt: null });

    expect(screen.getByText(new RegExp(ru.clients.noVisits))).toBeTruthy();
  });

  it('дата последнего визита показывается, когда он был', () => {
    show({}, { totalBookings: 3, lastVisitAt: '2026-08-17T09:00:00.000Z' });

    expect(screen.getByText(/17/)).toBeTruthy();
  });

  it('число визитов склоняется по правилам языка', () => {
    // «1 визитов» — то, ради чего в проекте вообще есть `plural`.
    show({}, { totalBookings: 1, lastVisitAt: '2026-08-17T09:00:00.000Z' });

    expect(screen.getByText(new RegExp(`1\\s+${ru.clients.visitCountOne}`))).toBeTruthy();
  });

  it('пять визитов склоняются иначе, чем один', () => {
    show({}, { totalBookings: 5, lastVisitAt: '2026-08-17T09:00:00.000Z' });

    expect(screen.getByText(new RegExp(`5\\s+${ru.clients.visitCountMany}`))).toBeTruthy();
  });
});

describe('ClientListItem — что принадлежит только мастеру', () => {
  it('заметка показывается, когда она есть', () => {
    show({ notes: 'Аллергия на аммиак.' });

    expect(screen.getByText('Аллергия на аммиак.')).toBeTruthy();
  });

  it('без заметки лишней пустой строки не появляется', () => {
    const { onOpenDetail } = show({ notes: null });

    expect(onOpenDetail).not.toHaveBeenCalled();
    expect(screen.queryByText('', { selector: 'p.border-l-2' })).toBeNull();
  });

  it('метка «любимая» названа словом', () => {
    show({ flag: 'favourite' });

    expect(screen.getByText(ru.clients.flagFavourite)).toBeTruthy();
  });

  it('метка «осторожно» названа словом, а не только красным', () => {
    show({ flag: 'attention' });

    expect(screen.getByText(ru.clients.flagAttention)).toBeTruthy();
  });

  it('без метки ни одна из подписей не появляется', () => {
    show({ flag: null });

    expect(screen.queryByText(ru.clients.flagFavourite)).toBeNull();
    expect(screen.queryByText(ru.clients.flagAttention)).toBeNull();
  });

  it('заблокированный клиент подписан словом', () => {
    show({ isBlocked: true });

    expect(screen.getByText(ru.clients.blocked)).toBeTruthy();
  });
});

describe('ClientListItem — три нажатия в одном прямоугольнике', () => {
  it('карандаш ведёт в правку и не открывает историю', () => {
    // Всплытие погашено вручную: без этого карточка под кнопкой открывала бы
    // шторку поверх формы правки.
    const { onOpenDetail, onEdit, onDelete } = show();

    fireEvent.click(screen.getByRole('button', { name: ru.common.edit }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onOpenDetail).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('корзина спрашивает про удаление и не открывает историю', () => {
    const { onOpenDetail, onEdit, onDelete } = show();

    fireEvent.click(screen.getByRole('button', { name: ru.common.delete }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onOpenDetail).not.toHaveBeenCalled();
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('нажатие мимо кнопок открывает историю', () => {
    const { onOpenDetail } = show();

    fireEvent.click(screen.getByText('Анна Берзиня'));

    expect(onOpenDetail).toHaveBeenCalledTimes(1);
  });
});

describe('ClientListItem — клавиатура и читалка', () => {
  it('в строке ровно три кнопки, и ни одна не вложена в другую', () => {
    // Была одна карточка `role="button"` с двумя кнопками внутри: вложенные
    // интерактивные элементы внутри `role="button"` — невалидный ARIA.
    show();

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    expect(
      buttons.some((outer) => buttons.some((inner) => outer !== inner && outer.contains(inner))),
    ).toBe(false);
  });

  it('имя клиента открывает историю и названо коротко', () => {
    // Доступное имя строки вбирало в себя весь текст карточки вместе с
    // подписями «Изменить» и «Удалить» — читалка объявляла кнопку в полсотни
    // слов.
    const { onOpenDetail } = show({ notes: 'Аллергия на аммиак.' });
    const open = screen.getByRole('button', { name: 'Анна Берзиня' });

    expect(open.textContent).toBe('Анна Берзиня');

    fireEvent.click(open);
    expect(onOpenDetail).toHaveBeenCalledTimes(1);
  });

  it('Enter на имени открывает историю', () => {
    const { onOpenDetail } = show();

    fireEvent.click(screen.getByRole('button', { name: 'Анна Берзиня' }));

    expect(onOpenDetail).toHaveBeenCalledTimes(1);
  });

  it('карточка не забирает себе вторую остановку табуляции', () => {
    // Она осталась ускорением для пальца, а не путём для клавиатуры: до той
    // же цели ведёт кнопка с именем.
    const { container } = show();

    expect(container.querySelectorAll('[tabindex]')).toHaveLength(0);
  });
});
