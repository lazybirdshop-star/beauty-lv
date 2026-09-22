// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '@/lib/i18n';
import { ru } from '@/lib/i18n/messages';

import { PublishSlotForm } from './publish-slot-form';

/**
 * Форма публикации окна (FIX.md F-10).
 *
 * Она задумана под быстрые повторные нажатия — мастер открывает день по
 * одному часу, — и отказ, вставленный между полями и кнопкой, сдвигал кнопку
 * вниз примерно на 25px: второй тап приходился в текст ошибки. Сообщение
 * вдобавок не гасло при смене даты и висело устаревшим.
 *
 * Проверяется порядок в потоке и сброс — то есть ровно те два свойства,
 * которые дефект и нарушал.
 */
afterEach(cleanup);

function renderForm(onPublish = vi.fn().mockRejectedValue(new Error('нет'))) {
  render(
    <I18nProvider locale="ru">
      <PublishSlotForm onPublish={onPublish} submitting={false} />
    </I18nProvider>,
  );
  return { onPublish };
}

/** Час, до которого точно не дойдёт часовой пояс запускающего тесты. */
const FUTURE_DATE = '2036-09-01';

async function submitAndFail() {
  fireEvent.change(screen.getByLabelText(ru.schedule.date), { target: { value: FUTURE_DATE } });
  fireEvent.click(screen.getByRole('button', { name: new RegExp(ru.schedule.addSlot) }));
  return screen.findByRole('alert');
}

describe('PublishSlotForm', () => {
  it('ошибка не выталкивает кнопку из-под пальца', async () => {
    renderForm();

    const alert = await submitAndFail();
    const button = screen.getByRole('button', { name: new RegExp(ru.schedule.addSlot) });

    // Сообщение идёт по документу *после* кнопки, значит вставка его в поток
    // не может её сдвинуть.
    expect(button.compareDocumentPosition(alert)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('смена даты гасит устаревший отказ', async () => {
    renderForm();
    await submitAndFail();

    fireEvent.change(screen.getByLabelText(ru.schedule.date), { target: { value: '2036-09-02' } });

    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it('полчаса — одно окно, два часа — четыре подряд', async () => {
    /* У окна нет собственной длины: она равна шагу сетки. «Длительность» в
       форме — это сколько окон подряд завести, и мастер, отдающая клиентам
       два часа, больше не нажимает «Добавить окно» четыре раза. */
    const onPublish = vi.fn().mockResolvedValue(undefined);
    renderForm(onPublish);

    fireEvent.change(screen.getByLabelText(ru.schedule.date), { target: { value: FUTURE_DATE } });
    fireEvent.change(screen.getByLabelText(ru.schedule.time), { target: { value: '10:00' } });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(ru.schedule.addSlot) }));

    await waitFor(() => expect(onPublish).toHaveBeenCalledTimes(1));
    expect(onPublish.mock.calls[0]![0]).toHaveLength(1);

    fireEvent.change(screen.getByLabelText(ru.schedule.openFor), { target: { value: '120' } });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(ru.schedule.addSlot) }));

    await waitFor(() => expect(onPublish).toHaveBeenCalledTimes(2));
    const moments = onPublish.mock.calls[1]![0] as string[];
    expect(moments).toHaveLength(4);
    /* Подряд, шагом в полчаса: 10:00, 10:30, 11:00, 11:30. */
    const gaps = moments
      .slice(1)
      .map((at, index) => (Date.parse(at) - Date.parse(moments[index]!)) / 60_000);
    expect(gaps).toEqual([30, 30, 30]);
  });

  it('смена времени гасит его тоже', async () => {
    renderForm();
    await submitAndFail();

    fireEvent.change(screen.getByLabelText(ru.schedule.time), { target: { value: '11:30' } });

    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });
});
