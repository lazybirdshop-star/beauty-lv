// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { NavBadge } from './nav-badge';

/**
 * Счётчик на пункте навигации.
 *
 * Точка сказала бы «здесь что-то есть»; число говорит, что именно и сколько, —
 * от этого зависит, откроет ли мастер раздел сейчас или после клиента. Поэтому
 * проверяются три вещи: ноль не рисуется вовсе, число не растягивает пилюлю
 * дальше значка, и рядом с цифрой лежит фраза словами — цифра без контекста
 * читалке ничего не сообщает.
 */

afterEach(cleanup);

const LABEL = 'Записей, ждущих подтверждения: 3';

describe('NavBadge — когда его нет', () => {
  it('нуля не бывает: пустой счётчик не рисуется', () => {
    // Пилюля с нулём означала бы «ноль чего-то важного» — шум на каждой вкладке.
    const { container } = render(<NavBadge count={0} label={LABEL} />);

    expect(container.firstChild).toBeNull();
  });

  it('отрицательное число — тоже ничего, а не «-1»', () => {
    const { container } = render(<NavBadge count={-1} label={LABEL} />);

    expect(container.firstChild).toBeNull();
  });
});

describe('NavBadge — что он показывает', () => {
  it('одна ждущая запись — единица', () => {
    render(<NavBadge count={1} label={LABEL} />);

    expect(screen.getByText('1')).toBeTruthy();
  });

  it('девять помещаются как есть', () => {
    render(<NavBadge count={9} label={LABEL} />);

    expect(screen.getByText('9')).toBeTruthy();
  });

  it('после девяти — «9+», иначе занятое утро растянет пилюлю за значок', () => {
    render(<NavBadge count={10} label={LABEL} />);

    expect(screen.getByText('9+')).toBeTruthy();
    expect(screen.queryByText('10')).toBeNull();
  });

  it('сотня тоже сворачивается в «9+»', () => {
    render(<NavBadge count={137} label={LABEL} />);

    expect(screen.getByText('9+')).toBeTruthy();
  });
});

describe('NavBadge — что слышит читалка', () => {
  it('рядом с цифрой лежит фраза словами', () => {
    render(<NavBadge count={3} label={LABEL} />);

    expect(screen.getByText(LABEL)).toBeTruthy();
  });

  it('сама цифра от читалки скрыта — иначе счёт прозвучал бы дважды', () => {
    render(<NavBadge count={3} label={LABEL} />);

    expect(screen.getByText('3').getAttribute('aria-hidden')).toBe('true');
  });

  it('«9+» на экране не мешает читалке услышать точное число', () => {
    // Пилюля округляет ради ширины; фраза словами — нет.
    render(<NavBadge count={42} label="Записей, ждущих подтверждения: 42" />);

    expect(screen.getByText('Записей, ждущих подтверждения: 42')).toBeTruthy();
  });
});
