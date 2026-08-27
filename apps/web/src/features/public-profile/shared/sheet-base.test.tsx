// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { I18nProvider } from '@/lib/i18n';

import { defaultSheetChrome, SheetBase } from './sheet-base';

/**
 * Имя диалога шторки записи (FIX.md F-21).
 *
 * Прогон записал «шторка — диалог без имени: нет `aria-labelledby`». Проверка
 * этого утверждения и есть содержание пункта: заголовок шторки — `Dialog.Title`
 * Radix, а он связывает панель с заголовком сам. Тест закрепляет гарантию там,
 * где она живёт: доступность шторки принадлежит `SheetBase`, а не миру, —
 * иначе шесть миров ломали бы её каждый по-своему.
 */
afterEach(cleanup);

function renderSheet(description?: string) {
  render(
    <I18nProvider locale="ru">
      <SheetBase
        open
        onOpenChange={() => undefined}
        title="Ваша запись"
        description={description}
        chrome={defaultSheetChrome}
      >
        <p>Содержимое</p>
      </SheetBase>
    </I18nProvider>,
  );
}

describe('SheetBase', () => {
  it('диалог назван своим заголовком', () => {
    renderSheet();

    // `getByRole` c именем ищет по вычисленному имени доступности — то есть
    // ровно через `aria-labelledby`, а не по тексту на экране.
    expect(screen.getByRole('dialog', { name: 'Ваша запись' })).toBeTruthy();
  });

  it('описание становится описанием диалога, когда оно есть', () => {
    renderSheet('Проверьте, всё ли верно');

    const dialog = screen.getByRole('dialog');
    const describedBy = dialog.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)?.textContent).toBe('Проверьте, всё ли верно');
  });

  it('без описания ссылка на него не выдумывается', () => {
    // Radix иначе укажет на несуществующий узел, и читалка сообщит пустоту.
    renderSheet();

    expect(screen.getByRole('dialog').getAttribute('aria-describedby')).toBeNull();
  });
});
