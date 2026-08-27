// @vitest-environment jsdom

import { defaultPageDesign, type DesignPresetKey } from '@amolie/shared-kernel';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '@/lib/i18n';
import { ru } from '@/lib/i18n/messages';
/* Через резолвер, а не из `en.ts` / `lv.ts` напрямую: те — частичные
   накладки поверх русского, и приложение читает их только собранными. */
import { buildMessages } from '@/lib/i18n/resolve';

import { composition as aura } from '../compositions/aura';
import { composition as funk } from '../compositions/funk';
import { composition as luxury } from '../compositions/luxury';
import { composition as minimal } from '../compositions/minimal';
import { composition as poster } from '../compositions/poster';
import { composition as soft } from '../compositions/soft';
import { buildFixtureOrganization } from '../registry/world-preview-fixtures';

/**
 * Подпись платформы стоит в подвале **каждого** мира.
 *
 * Это обещание продукта, а не украшение одного дерева: миры пришли шестью
 * разными файлами, и «во всех темах» здесь легко становится «в пяти из
 * шести» — при добавлении седьмого тем более. Каркас у каждого свой, поэтому
 * проверяется он, а не общий компонент.
 *
 * Внешность подписи тест не стережёт — она у каждого мира своя и проверяется
 * глазами и харнессом скриншотов (§16). Здесь три свойства: она есть, она
 * ведёт на лендинг и говорит языком **страницы**, а не браузера читателя.
 */

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: () => undefined }),
  usePathname: () => '/anna',
}));

afterEach(cleanup);

const WORLDS: [DesignPresetKey, { Shell: (typeof soft)['Shell'] }][] = [
  ['soft', soft],
  ['poster', poster],
  ['luxury', luxury],
  ['aura', aura],
  ['funk', funk],
  ['minimal', minimal],
];

describe.each(WORLDS)('подвал мира %s', (preset, world) => {
  it('несёт подпись платформы со ссылкой на лендинг', () => {
    const org = buildFixtureOrganization(defaultPageDesign(preset));

    render(
      <I18nProvider locale="ru">
        <world.Shell org={org}>
          <div />
        </world.Shell>
      </I18nProvider>,
    );

    const link = screen.getByRole('link', { name: ru.publicPage.madeOn });
    expect(link.getAttribute('href')).toBe('/');
  });
});

/*
 * Язык подписи — язык страницы, которую выбрала мастер, а не язык браузера
 * читателя. Клиент из Риги, открывший латышскую страницу, читает подвал
 * по-латышски, как и всё остальное на ней.
 */
describe('язык подписи', () => {
  it.each([
    ['ru', ru.publicPage.madeOn],
    ['lv', buildMessages('lv').publicPage.madeOn],
    ['en', buildMessages('en').publicPage.madeOn],
  ] as const)('на странице «%s» говорит её языком', (locale, expected) => {
    const org = buildFixtureOrganization(defaultPageDesign('soft'));

    render(
      <I18nProvider locale={locale}>
        <soft.Shell org={org}>
          <div />
        </soft.Shell>
      </I18nProvider>,
    );

    expect(screen.getByRole('link', { name: expected })).toBeTruthy();
  });

  it('имя продукта одно на все три языка', () => {
    for (const dictionary of [ru, buildMessages('lv'), buildMessages('en')]) {
      expect(dictionary.publicPage.madeOn).toContain('AMOLIE');
    }
  });
});
