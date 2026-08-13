// @vitest-environment jsdom

import { defaultPageDesign } from '@amolie/shared-kernel';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ru } from '@/lib/i18n/messages';

import { CalendarHost } from '../../registry/calendar-host';
import { CompositionProvider } from '../../registry/composition-context';
import { buildFixtureOrganization, buildFixtureSlots } from '../../registry/world-preview-fixtures';

import { composition } from './index';
import { Shell } from './shell';

/**
 * Дымовой тест мира: он рисуется целиком на настоящих контрактах движка.
 *
 * Мир пришёл готовым файлом и переложен в разметку продукта — а значит,
 * самый вероятный дефект здесь не «некрасиво», а «не смонтировалось»:
 * контракт секции разошёлся с движком, слот получил не тот проп. Проверяется
 * ровно это, и на тех же хостах, что стоят на маршруте (`CalendarHost`), а
 * не на упрощённой копии.
 *
 * Внешность миру этот тест не стережёт: облик проверяется глазами и
 * харнессом скриншотов (§16), а не строками разметки.
 */
afterEach(cleanup);

const org = buildFixtureOrganization(defaultPageDesign('aura'));
/* Дата фиксирована: окна фикстуры ставятся вперёд от неё, и календарь
   открывается на месяце первого окна — тест не должен зависеть от того, в
   какой день его запустили. */
const slots = buildFixtureSlots(new Date(2026, 7, 3));

function renderWorld() {
  return render(
    <CompositionProvider styleKey="aura" composition={composition}>
      <Shell org={org}>
        <CalendarHost org={org} initialSlots={slots} />
      </Shell>
    </CompositionProvider>,
  );
}

describe('мир AURA', () => {
  it('монтируется целиком: шапка, навигация и секция записи', () => {
    renderWorld();

    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(org.name);
    expect(screen.getByRole('navigation', { name: ru.publicPage.mainNav })).toBeTruthy();
    expect(screen.getByRole('grid', { name: ru.publicPage.bookingDays })).toBeTruthy();
  });

  it('главное действие не бывает тупиком: без выбранного времени оно называет, чего не хватает', () => {
    renderWorld();

    const cta = screen.getByRole('button', { name: ru.publicPage.pickDate });
    expect(cta.hasAttribute('disabled')).toBe(true);
  });

  it('прайс и контакты — те же слоты композиции, а не отдельные страницы', () => {
    const { ServiceListSection, ContactsSection } = composition;

    render(<ServiceListSection org={org} />);
    expect(screen.getByRole('heading', { name: ru.publicPage.servicesShort })).toBeTruthy();
    cleanup();

    render(<ContactsSection org={org} />);
    expect(screen.getByRole('heading', { name: ru.publicPage.contacts })).toBeTruthy();
  });
});
