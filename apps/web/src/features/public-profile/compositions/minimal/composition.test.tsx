// @vitest-environment jsdom

import { defaultPageDesign } from '@amolie/shared-kernel';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ru } from '@/lib/i18n/messages';

import { CalendarHost } from '../../registry/calendar-host';
import { CompositionProvider } from '../../registry/composition-context';
import { buildFixtureOrganization, buildFixtureSlots } from '../../registry/world-preview-fixtures';

import { composition } from './index';
import { Shell } from './shell';

/*
 * Мир монтируется целиком, а расписание внутри него читает адрес страницы
 * («повторить визит» из кабинета клиента). Роутера в тестовой среде нет —
 * подменяем пустым: этим тестам важен облик мира, а не просьба в адресе.
 */
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: () => undefined }),
  usePathname: () => '/anna',
}));

/**
 * Дымовой тест мира: он рисуется целиком на настоящих контрактах движка.
 *
 * Мир пришёл готовым файлом и переложен в разметку продукта, поэтому самый
 * вероятный дефект здесь не «некрасиво», а «не смонтировалось»: контракт
 * секции разошёлся с движком, слот получил не тот проп. Проверяется ровно
 * это, и на тех же хостах, что стоят на маршруте.
 *
 * Внешность миру этот тест не стережёт: облик проверяется глазами.
 */
afterEach(cleanup);

const org = buildFixtureOrganization(defaultPageDesign('minimal'));
/* Дата фиксирована: окна фикстуры ставятся вперёд от неё, и тест не должен
   зависеть от того, в какой день его запустили. */
const slots = buildFixtureSlots(new Date(2026, 7, 3));

function renderWorld() {
  return render(
    <CompositionProvider styleKey="minimal" composition={composition}>
      <Shell org={org}>
        <CalendarHost org={org} initialSlots={slots} />
      </Shell>
    </CompositionProvider>,
  );
}

describe('мир MINIMAL', () => {
  it('монтируется целиком: шапка, навигация и секция записи', () => {
    renderWorld();

    /* Имя мир разрезает надвое и ставит половины на разные строки, поэтому
       в `textContent` пробела между ними нет. Сравнение идёт по буквам, а
       не по строке: проверяется факт вывода имени, а не то, где мир его
       переносит. */
    const letters = (value: string) => value.toLowerCase().replace(/\s+/g, '');
    const heading = screen.getByRole('heading', { level: 1 }).textContent ?? '';
    expect(letters(heading)).toContain(letters(org.name));

    expect(screen.getByRole('navigation', { name: ru.publicPage.mainNav })).toBeTruthy();
    expect(screen.getByRole('grid', { name: ru.publicPage.bookingDays })).toBeTruthy();
  });

  /**
   * Дни-заполнители календаря (FIX.md F-22).
   *
   * Прогон записал: «нарисованы как `<span class="text-transparent">27</span>`
   * — глазом не видно, скринридер читает». Читалке они не достаются:
   * заполнитель несёт `aria-hidden`, и так во всех шести мирах. Тест держит
   * это свойство: числа соседнего месяца в календаре — фон, а не содержание,
   * и озвучивать «двадцать семь» рядом с «первое, свободно» нельзя.
   */
  it('дни соседнего месяца не достаются читалке', () => {
    renderWorld();

    const grid = screen.getByRole('grid', { name: ru.publicPage.bookingDays });
    const placeholders = [...grid.querySelectorAll('span')].filter(
      (node) => node.getAttribute('aria-hidden') === 'true',
    );

    // Заполнители в сетке есть — иначе проверка ниже ничего не значит.
    expect(placeholders.length).toBeGreaterThan(0);
    for (const node of placeholders) {
      expect(node.closest('[aria-hidden="true"]')).toBe(node);
    }
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

  /**
   * Плитки иконок красятся акцентом мастера, а не вшитыми цветами.
   *
   * В `minimal.html` здесь шесть готовых оттенков, и у автора они держались,
   * потому что и мир был синим. У нас акцент — ручка Студии, и на
   * перекрашенной странице вшитый синий спорил с ним в открытую. Тест
   * стережёт обе стороны: что плитка берёт `--accent` и что ни один
   * литеральный градиент не вернулся обратно.
   */
  it('красит иконки контактов акцентом, а не вшитыми цветами файла', () => {
    const { container } = render(<composition.ContactsSection org={org} />);

    const tiles = [...container.querySelectorAll('span')].filter((node) =>
      node.className.includes('bg-accent'),
    );
    expect(tiles.length).toBeGreaterThan(0);

    for (const node of container.querySelectorAll<HTMLElement>('[style]')) {
      expect(node.style.backgroundImage).not.toContain('linear-gradient');
    }
  });

  /**
   * Строка справочника существует только там, где за ней есть чем открыться.
   * Незаполненный телефон давал живую ссылку `tel:` в никуда — контрол,
   * который выглядит нажимаемым и не делает ничего.
   */
  it('не рисует контакт, которого у мастера нет', () => {
    const { container } = render(
      <composition.ContactsSection org={{ ...org, phone: '', instagram: undefined }} />,
    );

    expect(container.querySelectorAll('a[href^="tel:"]')).toHaveLength(0);
    expect(container.querySelectorAll('a[href*="instagram.com"]')).toHaveLength(0);
  });
});
