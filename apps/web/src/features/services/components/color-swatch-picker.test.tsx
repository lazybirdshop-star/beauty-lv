// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ru } from '@/lib/i18n/messages';

import { ColorSwatchPicker } from './color-swatch-picker';

/**
 * Цветная метка услуги — та, по которой в календаре видно, что стоит в 14:00,
 * не читая подписи.
 *
 * Здесь важны две вещи. Первая: «без цвета» — полноправный выбор, а не
 * отсутствие выбора, поэтому у него есть своя кнопка со своим именем, и
 * вернуться к нему можно из любого цвета. Вторая: выбранный образец обязан
 * читаться не только рамкой — сам цвет доступного имени не имеет, поэтому
 * каждая кнопка называет свой оттенок словами.
 */

afterEach(cleanup);

function show(value: string | null = null) {
  const onChange = vi.fn();
  render(<ColorSwatchPicker value={value} onChange={onChange} />);
  return { onChange };
}

describe('ColorSwatchPicker — из чего выбирают', () => {
  it('восемь оттенков плюс «без цвета»', () => {
    show();

    expect(screen.getAllByRole('button')).toHaveLength(9);
  });

  it('«без цвета» названо словами, а не пустым кружком', () => {
    show();

    expect(screen.getByRole('button', { name: ru.services.noColor })).toBeTruthy();
  });

  it('каждый оттенок называет себя — цвет доступного имени не имеет', () => {
    show();

    const named = screen
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label'))
      .filter((label): label is string => label !== null && label.startsWith('#'));

    expect(named).toHaveLength(8);
    expect(new Set(named).size).toBe(8);
  });

  it('оттенки не повторяют акцент бренда — метка услуги и кнопка записи не одно и то же', () => {
    show();

    const named = screen
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label') ?? '');

    expect(named).not.toContain('#e2568a');
  });
});

describe('ColorSwatchPicker — что сообщает выбор', () => {
  it('нажатие на оттенок отдаёт его код', () => {
    const { onChange } = show();
    const swatch = screen
      .getAllByRole('button')
      .find((button) => button.getAttribute('aria-label')?.startsWith('#'))!;

    fireEvent.click(swatch);

    expect(onChange).toHaveBeenCalledWith(swatch.getAttribute('aria-label'));
  });

  it('к «без цвета» можно вернуться — это выбор, а не начальное состояние', () => {
    const { onChange } = show('#A63A5F');

    fireEvent.click(screen.getByRole('button', { name: ru.services.noColor }));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('кнопки не отправляют форму, внутри которой стоят', () => {
    show();

    for (const button of screen.getAllByRole('button')) {
      expect(button.getAttribute('type')).toBe('button');
    }
  });
});

describe('ColorSwatchPicker — что отмечено выбранным', () => {
  it('выбранный оттенок обведён кольцом', () => {
    show('#A63A5F');

    expect(screen.getByRole('button', { name: '#A63A5F' }).className).toContain('ring-2');
  });

  it('невыбранные не обведены — иначе выбранным выглядит всё', () => {
    show('#A63A5F');

    const others = screen
      .getAllByRole('button')
      .filter((button) => button.getAttribute('aria-label') !== '#A63A5F');

    expect(others.every((button) => !button.className.includes('ring-2'))).toBe(true);
  });

  it('при пустом значении отмечено «без цвета»', () => {
    show(null);

    expect(screen.getByRole('button', { name: ru.services.noColor }).className).toContain('ring-2');
  });
});
