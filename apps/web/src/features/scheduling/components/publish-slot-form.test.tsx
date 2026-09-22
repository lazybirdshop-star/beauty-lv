// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '@/lib/i18n';
import { ru } from '@/lib/i18n/messages';

import type { BulkPublishResult } from '../api';
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

/** Ответ сервера: сколько создано, сколько пропущено и почему. */
function outcome(over: Partial<BulkPublishResult> = {}): BulkPublishResult {
  return {
    createdCount: 0,
    skippedCount: 0,
    busyCount: 0,
    blockedCount: 0,
    inThePastCount: 0,
    created: [],
    ...over,
  };
}

function slotAt(startsAt: string) {
  return {
    id: startsAt,
    organizationMemberId: 'member',
    startsAt,
    windowId: 'window',
    status: 'available',
    hiddenAt: null,
    createdAt: startsAt,
    updatedAt: startsAt,
  } as BulkPublishResult['created'][number];
}

async function submitWith(result: BulkPublishResult) {
  const onPublish = vi.fn().mockResolvedValue(result);
  renderForm(onPublish);
  fireEvent.change(screen.getByLabelText(ru.schedule.date), { target: { value: FUTURE_DATE } });
  fireEvent.click(screen.getByRole('button', { name: new RegExp(ru.schedule.addSlot) }));
  return screen.findByRole('status');
}

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

  it('полчаса — один момент, два часа — четыре подряд внутри окна', async () => {
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

  it('открытое окно названо отрезком, а не молчанием', async () => {
    /* Нажатие ничего не говорило: мастер не знала, создалось окно или нет, а
       календарь за шторкой ей не виден. */
    const status = await submitWith(
      outcome({
        createdCount: 2,
        created: [slotAt('2036-09-01T07:00:00.000Z'), slotAt('2036-09-01T07:30:00.000Z')],
      }),
    );

    /* Отрезок считается по созданным моментам: последний плюс шаг сетки. */
    expect(status.textContent).toMatch(/–/);
    expect(status.textContent).not.toBe('');
  });

  it('«окно уже было» — тоже ответ, а не тишина', async () => {
    /* Сервер отвечает успехом и когда не создал ничего: до этого такой ответ
       был неотличим от удачного. */
    const status = await submitWith(outcome({ skippedCount: 1 }));

    expect(status.textContent).toBe(ru.schedule.windowExists);
  });

  it('занятое визитом время называется своей причиной', async () => {
    const status = await submitWith(outcome({ busyCount: 1 }));

    expect(status.textContent).toBe(ru.schedule.windowBusy);
  });

  it('заблокированное время — своей', async () => {
    const status = await submitWith(outcome({ blockedCount: 1 }));

    expect(status.textContent).toBe(ru.schedule.windowBlocked);
  });

  it('правка поля гасит прежнее подтверждение', async () => {
    /* Подтверждение относится к отправленному: сменили дату — оно больше ни
       о чём, ровно как отказ. */
    await submitWith(outcome({ skippedCount: 1 }));

    fireEvent.change(screen.getByLabelText(ru.schedule.date), { target: { value: '2036-09-02' } });

    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  });

  it('смена времени гасит его тоже', async () => {
    renderForm();
    await submitAndFail();

    fireEvent.change(screen.getByLabelText(ru.schedule.time), { target: { value: '11:30' } });

    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });
});
