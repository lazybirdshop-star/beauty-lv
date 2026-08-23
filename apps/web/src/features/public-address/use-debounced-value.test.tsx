// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDebouncedValue } from './use-debounced-value';

/**
 * Значение, каким оно было `delay` мс назад, — но только когда перестало
 * меняться.
 *
 * Держит поле адреса от того, чтобы спрашивать сервер на каждой букве: набрать
 * «anna-nails» — это одиннадцать вопросов о десяти адресах, которые никому не
 * нужны. Проверяется ровно это свойство: пока палец печатает, наружу не
 * выходит ничего, а после паузы выходит последнее набранное, а не промежуточное.
 */

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

function Probe({ value, delay }: { value: string; delay?: number }) {
  const settled = useDebouncedValue(value, delay);
  return <output>{settled}</output>;
}

const settled = () => screen.getByRole('status').textContent;

describe('useDebouncedValue — первый кадр', () => {
  it('стартовое значение отдаётся сразу, без ожидания', () => {
    // Иначе поле адреса открывалось бы пустым и мигало через 400 мс.
    render(<Probe value="anna" />);

    expect(settled()).toBe('anna');
  });
});

describe('useDebouncedValue — пока печатают', () => {
  it('промежуточные буквы наружу не выходят', () => {
    const { rerender } = render(<Probe value="a" />);

    act(() => void vi.advanceTimersByTime(401));
    expect(settled()).toBe('a');

    rerender(<Probe value="an" />);
    rerender(<Probe value="ann" />);
    rerender(<Probe value="anna" />);
    act(() => void vi.advanceTimersByTime(399));

    // Три перерисовки за 399 мс — и ни одного вопроса серверу.
    expect(settled()).toBe('a');
  });

  it('после паузы выходит последнее набранное, а не первое из очереди', () => {
    const { rerender } = render(<Probe value="a" />);
    act(() => void vi.advanceTimersByTime(401));

    rerender(<Probe value="an" />);
    rerender(<Probe value="anna-nails" />);
    act(() => void vi.advanceTimersByTime(401));

    expect(settled()).toBe('anna-nails');
  });

  it('таймер перезапускается на каждой букве, а не тикает от первой', () => {
    const { rerender } = render(<Probe value="a" />);
    act(() => void vi.advanceTimersByTime(401));

    rerender(<Probe value="ab" />);
    act(() => void vi.advanceTimersByTime(300));
    rerender(<Probe value="abc" />);
    act(() => void vi.advanceTimersByTime(300));

    // 600 мс с начала набора, но всего 300 с последней буквы.
    expect(settled()).toBe('a');

    act(() => void vi.advanceTimersByTime(101));
    expect(settled()).toBe('abc');
  });
});

describe('useDebouncedValue — задержка', () => {
  it('своя задержка соблюдается', () => {
    const { rerender } = render(<Probe value="a" delay={1000} />);
    act(() => void vi.advanceTimersByTime(1001));

    rerender(<Probe value="b" delay={1000} />);
    act(() => void vi.advanceTimersByTime(999));
    expect(settled()).toBe('a');

    act(() => void vi.advanceTimersByTime(2));
    expect(settled()).toBe('b');
  });

  it('нулевая задержка отдаёт значение на ближайшем тике', () => {
    const { rerender } = render(<Probe value="a" delay={0} />);
    act(() => void vi.advanceTimersByTime(1));

    rerender(<Probe value="b" delay={0} />);
    act(() => void vi.advanceTimersByTime(1));

    expect(settled()).toBe('b');
  });
});

describe('useDebouncedValue — уборка', () => {
  it('снятый со страницы хук не будит таймер', () => {
    const { rerender, unmount } = render(<Probe value="a" />);
    rerender(<Probe value="b" />);

    unmount();

    // Незаснятый таймер попытался бы записать состояние в снятый компонент.
    expect(() => act(() => void vi.advanceTimersByTime(1000))).not.toThrow();
  });
});
