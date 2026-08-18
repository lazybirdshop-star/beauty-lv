// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { OwnColor, SwatchRow, type Swatch } from './color-field';

afterEach(cleanup);

/**
 * Ручка в том виде, в каком её собирает секция: ряд образцов и «свой цвет»
 * над одним решением. Порознь у них нет того поведения, ради которого этот
 * файл существует.
 */
function ColorKnob({ initial = null }: { initial?: string | null }) {
  const [value, setValue] = useState<string | null>(initial);
  const swatches: Swatch[] = [
    { value: '#FAF7F2', color: '#FAF7F2', label: 'светлая' },
    { value: '#2B2B33', color: '#2B2B33', label: 'тёмная' },
  ];

  return (
    <>
      <SwatchRow
        swatches={swatches}
        selected={value}
        checkColor="#111111"
        onSelect={setValue}
        onPreview={() => {}}
        onPreviewEnd={() => {}}
      />
      <OwnColor label="Свой цвет" value={value} fallback="#FFFFFF" onChange={setValue} />
    </>
  );
}

/** Поле ввода HEX. У пипетки рядом та же подпись, но она не textbox. */
function hexField(): HTMLInputElement {
  return screen.getByRole('textbox');
}

describe('OwnColor — поле догоняет решение', () => {
  it('показывает цвет выбранного образца, а не прежний', () => {
    render(<ColorKnob initial="#FAF7F2" />);
    expect(hexField().value).toBe('#FAF7F2');

    fireEvent.click(screen.getByRole('button', { name: 'тёмная' }));

    // Раньше поле держало начальное значение: useState берёт его один раз,
    // и мастер видела прежний HEX рядом с уже перекрашенной пипеткой.
    expect(hexField().value).toBe('#2B2B33');
  });

  it('принимает набранный целиком цвет как решение', () => {
    render(<ColorKnob initial="#FAF7F2" />);

    fireEvent.change(hexField(), { target: { value: '#2B2B33' } });

    expect(hexField().value).toBe('#2B2B33');
    expect(screen.getByRole('button', { name: 'тёмная' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('не затирает набранное наполовину', () => {
    render(<ColorKnob initial="#FAF7F2" />);

    // «#8C4» цветом не является, решением не становится — и не исчезает
    // из-под пальцев, пока мастер дописывает.
    fireEvent.change(hexField(), { target: { value: '#8C4' } });

    expect(hexField().value).toBe('#8C4');
    expect(screen.getByRole('button', { name: 'светлая' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('приводит набранное к верхнему регистру', () => {
    render(<ColorKnob />);

    fireEvent.change(hexField(), { target: { value: '#faf7f2' } });

    expect(hexField().value).toBe('#FAF7F2');
  });
});

describe('SwatchRow', () => {
  it('отмечает выбранный образец и только его', () => {
    render(<ColorKnob initial="#2B2B33" />);

    expect(screen.getByRole('button', { name: 'тёмная' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.getByRole('button', { name: 'светлая' }).getAttribute('aria-pressed')).toBe(
      'false',
    );
  });
});
