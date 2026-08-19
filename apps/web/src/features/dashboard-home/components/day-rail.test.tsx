// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ru } from '@/lib/i18n/messages';

import { DayRail, type RailHour } from './day-rail';

/**
 * Сутки мастера одной строкой — сигнатурное взаимодействие кабинета.
 *
 * Проверяется не картинка, а то, ради чего шкала стоит на главной: занятый час
 * можно открыть, пустой — не может притворяться контролом, а читалка обязана
 * называть словами то, что цвет показывает краской (цвет не имеет права быть
 * единственным носителем статуса).
 */

const RIGA = 'Europe/Riga';

beforeEach(() => {
  vi.useFakeTimers();
  // 14:00 в Риге.
  vi.setSystemTime(new Date('2026-08-20T11:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

const booked: RailHour = {
  hour: 10,
  state: 'booked',
  detail: 'Анна / Маникюр',
  bookingId: 'b1',
};
const free: RailHour = { hour: 16, state: 'free', detail: ru.home.railFree };

function show(hours: RailHour[] = [booked, free]) {
  const onOpenBooking = vi.fn();
  render(<DayRail hours={hours} timeZone={RIGA} onOpenBooking={onOpenBooking} />);
  return { onOpenBooking };
}

describe('DayRail — что можно нажать', () => {
  it('занятый и свободный час — кнопки, остальные двадцать два — нет', () => {
    show();

    // Двадцать четыре одинаковых контрола были бы двадцатью двумя ложными
    // обещаниями: в пустом часе открывать нечего.
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('по занятому часу открывается сама запись', () => {
    const { onOpenBooking } = show();

    fireEvent.click(screen.getByRole('button', { name: /10:00/ }));

    expect(onOpenBooking).toHaveBeenCalledWith('b1');
  });

  it('свободное окно записи не открывает — её там нет', () => {
    const { onOpenBooking } = show();

    fireEvent.click(screen.getByRole('button', { name: /16:00/ }));

    expect(onOpenBooking).not.toHaveBeenCalled();
  });

  it('шкала — группа, а не картинка: часы внутри остаются для читалки', () => {
    show();

    // Роль изображения сделала бы содержимое презентационным, и 24 колонки
    // перестали бы существовать для скрин-ридера.
    expect(screen.getByRole('group', { name: ru.home.railLabel })).toBeTruthy();
  });
});

describe('DayRail — что она говорит словами', () => {
  it('называет состояние часа словами, а не только цветом', () => {
    show();

    expect(screen.getByRole('button', { name: /10:00.*Занято/ })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: new RegExp(`16:00.*${ru.home.railFree}`) }),
    ).toBeTruthy();
  });

  it('имя клиента в название кнопки не идёт — его произносит читалка', () => {
    show();

    // Иначе один и тот же человек звался бы дважды — в шкале и в строке
    // списка, — и «открыть Анну» стало бы двусмысленным.
    expect(screen.getByRole('button', { name: /10:00/ }).textContent).not.toContain('Анна');
  });

  it('под курсором читалка рассказывает про этот час', () => {
    show();

    fireEvent.pointerEnter(screen.getByRole('button', { name: /10:00/ }));

    expect(screen.getByText('Анна / Маникюр')).toBeTruthy();
  });

  it('с клавиатуры — то же самое: фокус на часе объявляет его', () => {
    show();

    fireEvent.focus(screen.getByRole('button', { name: /16:00/ }));

    expect(screen.getByText(ru.home.railFree)).toBeTruthy();
  });

  it('без наведения показывает текущий час — молчать читалке нельзя', () => {
    show();

    // 14:00 в Риге: час считается в поясе организации, а не устройства.
    expect(screen.getByText('14:00')).toBeTruthy();
    expect(screen.getByText(ru.home.railEmpty)).toBeTruthy();
  });

  it('в пустых сутках всё равно называет час, а не пустоту', () => {
    show([]);

    expect(screen.getByText('14:00')).toBeTruthy();
    expect(screen.getByText(ru.home.railEmpty)).toBeTruthy();
  });
});
