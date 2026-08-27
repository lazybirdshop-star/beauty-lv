// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '@/lib/i18n';
import { fmt, ru } from '@/lib/i18n/messages';

import type { PublishedSlot } from '../types';
import { BulkPublishSheet } from './bulk-publish-sheet';

/**
 * Предпросмотр публикации периодом (FIX.md F-11).
 *
 * Шторка обещала «Будет опубликовано 32 окна», а после нажатия отвечала
 * «Опубликовано 0, пропущено 32»: предпросмотр считал сетку и ничего не знал
 * об уже открытых часах. Обещание и результат обязаны считаться по одному
 * правилу — иначе число в предпросмотре не значит ничего.
 */
afterEach(cleanup);

/** День далеко в будущем: сетка шторки отбрасывает прошедшие часы. */
const DAY = '2036-09-01';

function renderSheet(existing: PublishedSlot[]) {
  const onPublish = vi.fn().mockResolvedValue({
    createdCount: 0,
    skippedCount: 0,
    busyCount: 0,
    inThePastCount: 0,
  });

  render(
    <I18nProvider locale="ru">
      <BulkPublishSheet
        open
        onOpenChange={() => undefined}
        onPublish={onPublish}
        submitting={false}
        existing={existing}
      />
    </I18nProvider>,
  );

  /* Один день, окно 10:00–13:00 с шагом 60 минут — три старта: 10:00, 11:00,
     12:00 (правая граница не входит). Дни недели на одной дате не спрашивают
     вовсе — сужать в ней нечего. */
  fireEvent.change(screen.getByLabelText(ru.schedule.fromDate), { target: { value: DAY } });
  fireEvent.change(screen.getByLabelText(ru.schedule.toDate), { target: { value: DAY } });
  fireEvent.change(screen.getByLabelText(ru.schedule.dayStart), { target: { value: '10:00' } });
  fireEvent.change(screen.getByLabelText(ru.schedule.dayEnd), { target: { value: '13:00' } });

  return { onPublish };
}

function publish() {
  fireEvent.click(screen.getByRole('button', { name: ru.schedule.publish }));
}

/** Что шторка действительно отправила бы — источник правды для «уже открытых». */
function requestedTimes(): string[] {
  const { onPublish } = renderSheet([]);
  publish();
  const times = onPublish.mock.calls[0]![0] as string[];
  cleanup();
  return times;
}

function slotAt(startsAt: string): PublishedSlot {
  return {
    id: `slot-${startsAt}`,
    organizationMemberId: 'member',
    startsAt,
    status: 'available',
    createdAt: startsAt,
    updatedAt: startsAt,
  };
}

/** Число в предпросмотре стоит своим элементом рядом с «Будет опубликовано». */
function promisedCount(): string {
  return screen.getByText(ru.schedule.willPublish, { exact: false }).textContent ?? '';
}

describe('BulkPublishSheet — предпросмотр', () => {
  it('обещает столько, сколько действительно откроет', () => {
    renderSheet([]);

    expect(promisedCount()).toContain('3');
  });

  it('не считает уже открытые часы', () => {
    const times = requestedTimes();

    // Сетка та же, но два часа мастер уже открыла — обещать их снова нельзя.
    renderSheet(times.slice(0, 2).map(slotAt));

    expect(promisedCount()).toContain('1');
    expect(screen.getByText(fmt(ru.schedule.alreadyOpen, { count: 2 }))).toBeTruthy();
  });

  it('отправляет ровно обещанное, а не всю сетку', () => {
    const times = requestedTimes();
    const { onPublish } = renderSheet(times.slice(0, 2).map(slotAt));

    publish();

    /* Иначе «пропущено 2» в ответе означало бы не гонку, а нашу же
       арифметику, и мастер не смогла бы отличить одно от другого. */
    expect(onPublish.mock.calls[0]![0]).toEqual([times[2]]);
  });

  it('когда открыто всё — публиковать нечего', () => {
    const times = requestedTimes();
    renderSheet(times.map(slotAt));

    /* На одной дате подсказка своя: ряда дней недели на экране нет, и звать
       проверить его значило бы посылать мастера искать то, чего не показано. */
    expect(screen.getByText(ru.schedule.nothingToPublishDay)).toBeTruthy();
    expect(screen.getByRole('button', { name: ru.schedule.publish }).hasAttribute('disabled')).toBe(
      true,
    );
  });
});

/**
 * Одна дата — не период.
 *
 * Дни недели прореживают длинный отрезок; на отрезке в одну дату они умеют
 * только пропустить её целиком, и мастер была обязана сперва сообразить, какой
 * это день недели, и найти его среди семи кнопок — иначе форма отвечала
 * «нечего публиковать» на исправно заполненные поля.
 */
describe('BulkPublishSheet — одна дата', () => {
  /** 6 сентября 2036 — суббота: по умолчанию отмечены только будни. */
  const SATURDAY = '2036-09-06';

  function renderEmpty() {
    render(
      <I18nProvider locale="ru">
        <BulkPublishSheet
          open
          onOpenChange={() => undefined}
          onPublish={vi.fn()}
          submitting={false}
          existing={[]}
        />
      </I18nProvider>,
    );
    fireEvent.change(screen.getByLabelText(ru.schedule.dayStart), { target: { value: '10:00' } });
    fireEvent.change(screen.getByLabelText(ru.schedule.dayEnd), { target: { value: '13:00' } });
  }

  it('ряд дней недели не показывается и на сетку не влияет', () => {
    renderEmpty();
    fireEvent.change(screen.getByLabelText(ru.schedule.fromDate), { target: { value: SATURDAY } });
    fireEvent.change(screen.getByLabelText(ru.schedule.toDate), { target: { value: SATURDAY } });

    expect(screen.queryByText(ru.schedule.weekdays)).toBeNull();
    expect(promisedCount()).toContain('3');
  });

  it('ряд возвращается, как только период стал длиннее суток', () => {
    renderEmpty();
    fireEvent.change(screen.getByLabelText(ru.schedule.fromDate), { target: { value: SATURDAY } });
    fireEvent.change(screen.getByLabelText(ru.schedule.toDate), {
      target: { value: '2036-09-10' },
    });

    expect(screen.getByText(ru.schedule.weekdays)).toBeTruthy();
  });

  it('начало, обогнавшее конец, тянет конец за собой', () => {
    renderEmpty();
    /* Нативный `min` у второго поля запрещает выбрать день раньше первого, но
       уже выбранный не поправляет: вывернутый отрезок давал пустую сетку при
       двух заполненных полях. Заодно это и есть выбор одной даты — одним
       нажатием вместо двух. */
    fireEvent.change(screen.getByLabelText(ru.schedule.fromDate), { target: { value: SATURDAY } });

    expect(screen.getByLabelText<HTMLInputElement>(ru.schedule.toDate).value).toBe(SATURDAY);
    expect(promisedCount()).toContain('3');
  });
});
