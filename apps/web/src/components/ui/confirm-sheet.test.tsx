// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ru } from '@/lib/i18n/messages';

import { ConfirmSheet } from './confirm-sheet';

/**
 * Подтверждение необратимого действия — один лист на весь кабинет: отмена
 * визита, удаление услуги и клиента, блокировка, выход.
 *
 * Здесь проверяется то, из-за чего лист вообще написан общим: отказ обязан
 * быть таким же доступным, как согласие (и стоять первым), подпись отказа
 * обязана перекрываться — на листе «Отменить визит?» две кнопки со словом
 * «отменить» означают противоположное друг другу, — и во время работы
 * согласие обязано запираться, иначе одно нажатие уходит дважды.
 */

afterEach(cleanup);

function show(props: Partial<React.ComponentProps<typeof ConfirmSheet>> = {}) {
  const onConfirm = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <ConfirmSheet
      open
      onOpenChange={onOpenChange}
      title="Удалить услугу?"
      onConfirm={onConfirm}
      {...props}
    />,
  );
  return { onConfirm, onOpenChange };
}

describe('ConfirmSheet — что написано', () => {
  it('называет само действие вопросом', () => {
    show();

    expect(screen.getByText('Удалить услугу?')).toBeTruthy();
  });

  it('последствие называется словами, когда его передали', () => {
    // «Вы уверены?» не сообщает ничего; «Клиент увидит запись отменённой» —
    // сообщает. Описание для того и есть.
    show({ description: 'Клиент увидит запись как отменённую.' });

    expect(screen.getByText('Клиент увидит запись как отменённую.')).toBeTruthy();
  });

  it('закрытый лист ничего не показывает', () => {
    show({ open: false });

    expect(screen.queryByText('Удалить услугу?')).toBeNull();
  });
});

describe('ConfirmSheet — подписи кнопок', () => {
  it('по умолчанию это «Отмена» и «Удалить»', () => {
    show();

    expect(screen.getByRole('button', { name: ru.common.cancel })).toBeTruthy();
    expect(screen.getByRole('button', { name: ru.common.delete })).toBeTruthy();
  });

  it('согласие переименовывается под действие', () => {
    show({ confirmLabel: 'Заблокировать' });

    expect(screen.getByRole('button', { name: 'Заблокировать' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: ru.common.delete })).toBeNull();
  });

  it('отказ переименовывается тоже — иначе «Отменить визит?» звучит дважды', () => {
    show({ title: 'Отменить визит?', confirmLabel: 'Отменить визит', dismissLabel: 'Оставить' });

    expect(screen.getByRole('button', { name: 'Оставить' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: ru.common.cancel })).toBeNull();
  });
});

describe('ConfirmSheet — что делают нажатия', () => {
  it('согласие зовёт действие', () => {
    const { onConfirm } = show();

    fireEvent.click(screen.getByRole('button', { name: ru.common.delete }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('отказ закрывает лист и действия не зовёт', () => {
    const { onConfirm, onOpenChange } = show();

    fireEvent.click(screen.getByRole('button', { name: ru.common.cancel }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('Escape закрывает лист — отказаться должно быть так же легко, как согласиться', () => {
    const { onConfirm, onOpenChange } = show();

    fireEvent.keyDown(document.body, { key: 'Escape' });

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe('ConfirmSheet — пока действие идёт', () => {
  it('согласие заперто, чтобы одно нажатие не ушло дважды', () => {
    show({ loading: true });

    const confirm = screen.getByRole('button', { name: ru.common.processing });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
  });

  it('подпись меняется на «идёт работа», а не остаётся прежней', () => {
    show({ loading: true, confirmLabel: 'Удалить' });

    expect(screen.getByText(ru.common.processing)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Удалить' })).toBeNull();
  });

  it('отказ остаётся доступным — запертыми обеими кнопками лист стал бы ловушкой', () => {
    show({ loading: true });

    const dismiss = screen.getByRole('button', { name: ru.common.cancel }) as HTMLButtonElement;
    expect(dismiss.disabled).toBe(false);
  });
});
