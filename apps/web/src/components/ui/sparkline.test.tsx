// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Sparkline } from './sparkline';

/**
 * Микро-график внутри плитки числа.
 *
 * Проверяется то, чем ряд отвечает за правду: положение точки обратно
 * значению (выше — больше), плоский ряд не притворяется движением, длинный ряд
 * обрезается по хвосту — показывать надо последние периоды, а не первые, — и
 * то, что график называет себя словами: форма не имеет права быть
 * единственным носителем значения.
 */

afterEach(cleanup);

/** Вертикальные координаты линии в порядке отрисовки. */
function ys(container: HTMLElement): number[] {
  const line = container.querySelector('polyline');
  if (!line) return [];
  return line
    .getAttribute('points')!
    .split(' ')
    .map((pair) => Number.parseFloat(pair.split(',')[1]!));
}

describe('Sparkline', () => {
  it('называет ряд словами — читалке достаётся смысл, а не картинка', () => {
    render(<Sparkline data={[1, 2, 3]} label="Записей за неделю" />);
    expect(screen.getByRole('img', { name: 'Записей за неделю' })).toBeTruthy();
  });

  it('чем больше значение, тем выше точка', () => {
    const { container } = render(<Sparkline data={[1, 3, 2]} label="Ряд" />);
    const [low, high, middle] = ys(container);
    /* Ось экрана растёт вниз: у большего значения координата меньше. */
    expect(high).toBeLessThan(middle!);
    expect(middle).toBeLessThan(low!);
  });

  it('плоский ряд идёт серединой, а не растянут во всю высоту', () => {
    const { container } = render(<Sparkline data={[4, 4, 4]} label="Ряд" />);
    const points = ys(container);
    expect(new Set(points).size).toBe(1);
    expect(points[0]).toBe(16);
  });

  it('ряд из нулей рисуется, а не исчезает: это факт, а не отсутствие данных', () => {
    const { container } = render(<Sparkline data={[0, 0, 0]} label="Ряд" />);
    expect(ys(container)).toHaveLength(3);
  });

  it('пустой ряд не рисуется вовсе — пустая рамка ничего не говорит', () => {
    const { container } = render(<Sparkline data={[]} label="Ряд" />);
    expect(container.firstChild).toBeNull();
  });

  it('один период не рисуется вовсе (FIX.md F-37)', () => {
    /* Линия из одной точки — неправда о ряде, но и одинокая точка у левого
       края пустой полосы читается не как «данных на один срок», а как
       недорисованный график. О первом периоде говорит подпись плитки, и
       говорит она это словами. */
    const { container } = render(<Sparkline data={[7]} label="Ряд" />);
    expect(container.firstChild).toBeNull();
  });

  it('длинный ряд обрезается по хвосту: показываются последние периоды', () => {
    const data = Array.from({ length: 40 }, (_, index) => index + 1);
    const { container } = render(<Sparkline data={data} label="Ряд" />);
    const points = ys(container);
    expect(points).toHaveLength(12);
    /* Ряд возрастающий, значит взят его хвост: последняя точка — самая верхняя. */
    expect(points.at(-1)).toBeLessThan(points[0]!);
  });
});
