// @vitest-environment jsdom

import { renderToStaticMarkup } from 'react-dom/server';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { CountUp } from './count-up';

/**
 * Счётчик, доводящий число до значения пружиной.
 *
 * Здесь проверяется не анимация, а три обязательства, из-за которых компонент
 * написан своим, а не взят готовым с reactbits:
 *
 * 1. Сервер рисует сразу конечное значение — без JS в поле стоит верное число,
 *    и гидратация не расходится с разметкой.
 * 2. Формат собирается внутри из локали. Оригинал зашивает `en-US`, и в
 *    трёхъязычном кабинете мастер увидела бы чужую пунктуацию.
 * 3. Деньги не округляются: копейки — данные, а не оформление.
 *
 * Первые два проверяются серверным рендером, а не `render` из RTL: доводку
 * ведёт `requestAnimationFrame`, которого в jsdom нет, поэтому на клиенте
 * число осталось бы на старте пружины и тест мерил бы jsdom, а не наш код.
 */

afterEach(cleanup);

/** Текст, который увидит читатель без JS — то есть на сервере. */
function ssr(node: React.ReactElement): string {
  return renderToStaticMarkup(node).replace(/<[^>]+>/g, '');
}

describe('CountUp — без JS в поле стоит верное число', () => {
  it('сервер рисует конечное значение, а не старт пружины', () => {
    expect(ssr(<CountUp to={148} locale="ru" />)).toBe('148');
  });

  it('ноль остаётся нулём, а не пустым местом', () => {
    expect(ssr(<CountUp to={0} locale="ru" />)).toBe('0');
  });

  it('заданный старт на разметку не влияет — правда только у конечного значения', () => {
    expect(ssr(<CountUp to={12} from={999} locale="ru" />)).toBe('12');
  });
});

describe('CountUp — счёт принадлежит языку мастера', () => {
  it('разряды разделяются так, как принято в локали', () => {
    // Ожидание считается тем же `Intl`, что и подпись: конкретный символ —
    // свойство ICU, а наше здесь то, что он вообще взят из локали, а не зашит.
    const expected = new Intl.NumberFormat('ru', { maximumFractionDigits: 0 }).format(12345);

    expect(ssr(<CountUp to={12345} locale="ru" />)).toBe(expected);
  });

  it('английский и русский пишут одно и то же число по-разному', () => {
    expect(ssr(<CountUp to={12345} locale="en" />)).not.toBe(
      ssr(<CountUp to={12345} locale="ru" />),
    );
  });

  it('счёт без валюты не показывает дробную часть — клиентов не бывает 8,4', () => {
    expect(ssr(<CountUp to={8.4} locale="ru" />)).toBe('8');
  });
});

describe('CountUp — деньги', () => {
  it('валюта пишется по правилам локали', () => {
    const expected = new Intl.NumberFormat('ru', { style: 'currency', currency: 'EUR' }).format(
      463,
    );

    expect(ssr(<CountUp to={463} currency="EUR" locale="ru" />)).toBe(expected);
  });

  it('копейки не теряются', () => {
    // 462.96 не имеет права стать 463: сумма в разделе про деньги — данные,
    // а не оформление.
    expect(ssr(<CountUp to={462.96} currency="EUR" locale="ru" />)).toMatch(/462[,.  ]?96/);
  });

  it('та же сумма в другой валюте — другой знак', () => {
    expect(ssr(<CountUp to={10} currency="USD" locale="en" />)).toContain('$');
  });

  it('одна и та же локаль пишет валюту одинаково в обоих плитках', () => {
    // Две плитки на одном экране обязаны звучать одним голосом.
    expect(ssr(<CountUp to={5} currency="EUR" locale="en" />)).toBe(
      ssr(<CountUp to={5} currency="EUR" locale="en" />),
    );
  });
});

describe('CountUp — разметка', () => {
  it('это один инлайновый span, который можно поставить внутрь плитки', () => {
    const { container } = render(<CountUp to={7} locale="ru" />);

    expect(container.firstElementChild?.tagName).toBe('SPAN');
  });

  it('переданный класс доходит до узла — кегль задаёт плитка, а не счётчик', () => {
    render(<CountUp to={7} locale="ru" className="text-4xl" />);

    expect(screen.getByText(/\d/).className).toContain('text-4xl');
  });
});
