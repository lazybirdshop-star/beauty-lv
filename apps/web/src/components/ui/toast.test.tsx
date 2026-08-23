// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider, useToast, type ToastOptions } from './toast';

/**
 * Мгновенный отклик кабинета.
 *
 * Канал появился как ответ на две дыры аудита: неудавшаяся мутация молчала, а
 * «Не пришёл» был необратим. Отсюда три обязательства, которые здесь и
 * проверяются:
 *
 * 1. Провал объявляется настойчиво (`role="alert"`) и висит дольше — его
 *    нельзя пропустить; обычное сообщение объявляется вежливо (`role="status"`).
 * 2. Действие рядом с сообщением — это «вернуть как было», и нажатие обязано
 *    и вызвать возврат, и убрать плашку.
 * 3. Стопка не растёт бесконечно: занятое утро не имеет права закрыть экран
 *    собственными уведомлениями.
 *
 * `useToast` вне провайдера бросает исключение намеренно: молчаливый no-op —
 * ровно та ошибка, ради которой канал написан.
 */

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

/** Кнопка, которая показывает переданное уведомление. */
function Trigger({ options, label = 'показать' }: { options: ToastOptions; label?: string }) {
  const toast = useToast();
  return (
    <button type="button" onClick={() => toast(options)}>
      {label}
    </button>
  );
}

function show(...triggers: { options: ToastOptions; label?: string }[]) {
  render(
    <ToastProvider>
      {triggers.map((trigger, index) => (
        <Trigger key={index} {...trigger} />
      ))}
    </ToastProvider>,
  );
}

describe('ToastProvider — как звучит сообщение', () => {
  it('обычное сообщение объявляется вежливо', () => {
    show({ options: { message: 'Сохранено' } });

    fireEvent.click(screen.getByRole('button', { name: 'показать' }));

    expect(screen.getByRole('status').textContent).toContain('Сохранено');
  });

  it('провал объявляется настойчиво — его нельзя пропустить', () => {
    show({ options: { message: 'Не удалось', tone: 'danger' } });

    fireEvent.click(screen.getByRole('button', { name: 'показать' }));

    expect(screen.getByRole('alert').textContent).toContain('Не удалось');
  });
});

describe('ToastProvider — сколько живёт', () => {
  it('обычное уходит через пять секунд', () => {
    show({ options: { message: 'Сохранено' } });
    fireEvent.click(screen.getByRole('button', { name: 'показать' }));

    act(() => void vi.advanceTimersByTime(4999));
    expect(screen.queryByText('Сохранено')).toBeTruthy();

    act(() => void vi.advanceTimersByTime(2));
    expect(screen.queryByText('Сохранено')).toBeNull();
  });

  it('провал висит дольше — восемь секунд', () => {
    show({ options: { message: 'Не удалось', tone: 'danger' } });
    fireEvent.click(screen.getByRole('button', { name: 'показать' }));

    act(() => void vi.advanceTimersByTime(5001));
    expect(screen.queryByText('Не удалось')).toBeTruthy();

    act(() => void vi.advanceTimersByTime(3000));
    expect(screen.queryByText('Не удалось')).toBeNull();
  });
});

describe('ToastProvider — вернуть как было', () => {
  it('без действия лишней кнопки не появляется', () => {
    show({ options: { message: 'Сохранено' } });
    fireEvent.click(screen.getByRole('button', { name: 'показать' }));

    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('нажатие на действие возвращает как было', () => {
    const onAction = vi.fn();
    show({ options: { message: 'Отмечено «не пришёл»', actionLabel: 'Вернуть', onAction } });
    fireEvent.click(screen.getByRole('button', { name: 'показать' }));

    fireEvent.click(screen.getByRole('button', { name: 'Вернуть' }));

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('после возврата плашка уходит сразу — иначе её нажмут дважды', () => {
    show({ options: { message: 'Отмечено', actionLabel: 'Вернуть', onAction: () => {} } });
    fireEvent.click(screen.getByRole('button', { name: 'показать' }));

    fireEvent.click(screen.getByRole('button', { name: 'Вернуть' }));

    expect(screen.queryByText('Отмечено')).toBeNull();
  });
});

describe('ToastProvider — стопка не закрывает экран', () => {
  it('одновременно видно не больше трёх', () => {
    show(
      { options: { message: 'Первое' }, label: 'один' },
      { options: { message: 'Второе' }, label: 'два' },
      { options: { message: 'Третье' }, label: 'три' },
      { options: { message: 'Четвёртое' }, label: 'четыре' },
    );

    for (const label of ['один', 'два', 'три', 'четыре']) {
      fireEvent.click(screen.getByRole('button', { name: label }));
    }

    expect(screen.queryByText('Первое')).toBeNull();
    expect(screen.getByText('Второе')).toBeTruthy();
    expect(screen.getByText('Четвёртое')).toBeTruthy();
  });

  it('одинаковые сообщения остаются разными плашками', () => {
    show(
      { options: { message: 'Готово' }, label: 'один' },
      { options: { message: 'Готово' }, label: 'два' },
    );

    fireEvent.click(screen.getByRole('button', { name: 'один' }));
    fireEvent.click(screen.getByRole('button', { name: 'два' }));

    expect(screen.getAllByText('Готово')).toHaveLength(2);
  });
});

describe('useToast — вне провайдера', () => {
  it('бросает исключение, а не молча ничего не делает', () => {
    // Молчаливый no-op здесь означал бы вернувшуюся дыру аудита: мутация
    // упала, а мастер об этом не узнала.
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<Trigger options={{ message: 'нет провайдера' }} />)).toThrow(
      /ToastProvider/,
    );

    quiet.mockRestore();
  });
});
