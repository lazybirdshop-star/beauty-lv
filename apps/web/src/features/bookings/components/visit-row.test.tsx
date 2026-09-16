// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { I18nProvider } from '@/lib/i18n';
import { ru } from '@/lib/i18n/messages';

import { VisitRow } from './visit-row';

/**
 * Пилюля статуса в строке визита.
 *
 * Под заголовками «Ждут отметки» и «Сейчас в кресле» состояние уже названо
 * разделом, и «Подтверждена» в каждой строке рядом с «Завершить» ничего к
 * решению не добавляла. А в «Дальше» тот же чип решает: там рядом с ним
 * стоит «Подтвердить», и мастер по нему и отличает, кому ещё не ответили.
 */

afterEach(cleanup);

function row(props: { showStatus?: boolean } = {}) {
  render(
    <I18nProvider locale="ru">
      <VisitRow
        startsAt="2026-09-16T09:00:00.000Z"
        minutes={90}
        clientName="Līga Āboliņa"
        serviceName="Педикюр"
        status="confirmed"
        onOpen={() => undefined}
        action={<button type="button">{ru.bookings.markCompleted}</button>}
        {...props}
      />
    </I18nProvider>,
  );
}

describe('VisitRow — пилюля статуса', () => {
  it('по умолчанию называет статус', () => {
    row();

    expect(screen.queryByText(ru.bookings.statusConfirmed)).not.toBeNull();
  });

  it('молчит там, где состояние назвал раздел', () => {
    row({ showStatus: false });

    expect(screen.queryByText(ru.bookings.statusConfirmed)).toBeNull();
    /* Действие при этом остаётся: строка не теряет ни одного решения. */
    expect(screen.queryByText(ru.bookings.markCompleted)).not.toBeNull();
  });
});
