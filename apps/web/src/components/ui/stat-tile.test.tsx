// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { StatTile } from './stat-tile';

/**
 * Плитка числа.
 *
 * Проверяется не оформление, а два обещания: плитка с адресом — настоящая
 * ссылка (число обязано вести в раздел, где оно раскрывается), плитка без
 * адреса не притворяется контролом, и ряд периодов появляется только вместе
 * со своей подписью — безымянный график читалке ничего не сообщает.
 */

afterEach(cleanup);

describe('StatTile', () => {
  it('плитка с адресом — ссылка в свой раздел', () => {
    render(<StatTile label="Клиенты" value={148} href="/salon/dashboard/clients" />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/salon/dashboard/clients');
    expect(link.textContent).toContain('148');
  });

  it('плитка без адреса не притворяется контролом', () => {
    render(<StatTile label="Средний чек" value="45 €" />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('ряд периодов приходит со своей подписью', () => {
    render(
      <StatTile label="Записи" value={412} trend={[1, 2, 3]} trendLabel="Записей за неделю" />,
    );
    expect(screen.getByRole('img', { name: 'Записей за неделю' })).toBeTruthy();
  });

  it('ряд без подписи не рисуется: график, который нечем прочесть, — не данные', () => {
    render(<StatTile label="Записи" value={412} trend={[1, 2, 3]} />);
    expect(screen.queryByRole('img')).toBeNull();
  });
});
