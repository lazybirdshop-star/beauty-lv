import { DASHBOARD_ERROR_CODES } from '@amolie/shared-kernel';
import { describe, expect, it } from 'vitest';

import { ApiError, RequestTimeoutError } from './api-error';
import { apiErrorCodeOf, describeApiError } from './describe-api-error';
import { en } from './i18n/en';
import { lv } from './i18n/lv';
import { ru } from './i18n/messages';
import { buildMessages } from './i18n/resolve';

/**
 * Отказ сервера, сказанный словами кабинета.
 *
 * Главное свойство, ради которого файл написан: серверная фраза не попадает на
 * экран ни в одной ветке. Она приходит по-русски, а кабинет говорит на трёх
 * языках, и раньше английская форма записи отвечала «Это время уже прошло».
 *
 * Второе свойство — устойчивость к рассинхрону: API вправе уйти вперёд
 * словаря, и незнакомый код обязан свестись к общей фразе, а не показать
 * мастеру `slot_frobnicated`.
 */

const RU_PROSE = 'Это время уже прошло';

function serverError(code: string, message = RU_PROSE, status = 409) {
  return new ApiError(status, message, { message, code, statusCode: status });
}

describe('describeApiError — знакомый код', () => {
  it('переводится на язык мастера', () => {
    const error = serverError(DASHBOARD_ERROR_CODES.slotInPast);

    expect(describeApiError(error, ru)).toBe(ru.apiErrors.slot_in_past);
    expect(describeApiError(error, buildMessages('en'))).toBe(en.apiErrors!.slot_in_past);
    expect(describeApiError(error, buildMessages('lv'))).toBe(lv.apiErrors!.slot_in_past);
  });

  it('серверная проза на экран не идёт', () => {
    const error = serverError(DASHBOARD_ERROR_CODES.slotInPast);

    expect(describeApiError(error, buildMessages('en'))).not.toContain('прошло');
  });

  it('три разных отказа под одним 409 звучат по-разному', () => {
    // Ровно затем код и нужен: по статусу их не отличить, а мастеру они
    // говорят разное — обновить страницу, взять другое окно, убрать услугу.
    const said = [
      DASHBOARD_ERROR_CODES.slotJustTaken,
      DASHBOARD_ERROR_CODES.slotInPast,
      DASHBOARD_ERROR_CODES.notEnoughTime,
    ].map((code) => describeApiError(serverError(code), ru));

    expect(new Set(said).size).toBe(3);
  });

  it('запасная фраза не перебивает известную причину', () => {
    const error = serverError(DASHBOARD_ERROR_CODES.clientPhoneTaken);

    expect(describeApiError(error, ru, 'Не удалось сохранить')).toBe(
      ru.apiErrors.client_phone_taken,
    );
  });

  it.each(Object.values(DASHBOARD_ERROR_CODES))(
    'код «%s» переведён во всех трёх языках',
    (code) => {
      // Словарь и список кодов не имеют права разойтись: новый код без строки
      // даёт мастеру общую фразу вместо причины, и заметить это можно было бы
      // только глазами.
      for (const dict of [ru, en, lv]) {
        expect((dict.apiErrors as Record<string, string> | undefined)?.[code]).toBeTruthy();
      }
    },
  );
});

describe('describeApiError — всё остальное', () => {
  it('незнакомый код сводится к общей фразе, а не показывается как есть', () => {
    const error = serverError('slot_frobnicated');

    expect(describeApiError(error, ru)).toBe(ru.common.actionFailed);
  });

  it('отказ без кода не печатает серверную фразу', () => {
    const error = new ApiError(500, RU_PROSE, { message: RU_PROSE, statusCode: 500 });

    expect(describeApiError(error, ru)).toBe(ru.common.actionFailed);
  });

  it('обрыв сети — та же общая фраза, а не «undefined»', () => {
    expect(describeApiError(new Error('offline'), ru)).toBe(ru.common.actionFailed);
    expect(describeApiError(undefined, ru)).toBe(ru.common.actionFailed);
    expect(describeApiError('строка', ru)).toBe(ru.common.actionFailed);
  });

  it('экран со своей фразой получает её, а не общую', () => {
    // Форма записи говорит «не удалось создать запись» — это точнее, чем
    // «не получилось».
    expect(describeApiError(new Error('offline'), ru, ru.bookings.createFailed)).toBe(
      ru.bookings.createFailed,
    );
  });
});

describe('apiErrorCodeOf — когда причина названа', () => {
  it('отдаёт код известного отказа', () => {
    expect(apiErrorCodeOf(serverError(DASHBOARD_ERROR_CODES.slotBooked))).toBe('slot_booked');
  });

  it('молчит про незнакомый код', () => {
    expect(apiErrorCodeOf(serverError('slot_frobnicated'))).toBeNull();
  });

  it('молчит про чужую ошибку', () => {
    expect(apiErrorCodeOf(new Error('offline'))).toBeNull();
    expect(apiErrorCodeOf(null)).toBeNull();
  });
});

/**
 * Ответа не было — единственная ветка, в которой неизвестно, дошёл ли запрос.
 *
 * Поэтому она стоит выше всего остального, включая `fallback` экрана: «не
 * удалось сохранить» здесь было бы утверждением, которого никто не проверял,
 * и звало бы нажать второй раз — то есть завести дубликат.
 */
describe('describeApiError — ответа не было', () => {
  it('оборванное ожидание названо своими словами на всех трёх языках', () => {
    for (const t of [ru, buildMessages('lv'), buildMessages('en')]) {
      expect(describeApiError(new RequestTimeoutError(25_000), t)).toBe(t.common.timedOut);
    }
  });

  it('`504` от прокси читается так же, как оборванное ожидание', () => {
    expect(describeApiError(new ApiError(504, 'API did not answer in time'), ru)).toBe(
      ru.common.timedOut,
    );
  });

  it('перебивает запасную фразу экрана — она обещала бы лишнее', () => {
    expect(describeApiError(new RequestTimeoutError(25_000), ru, ru.common.saveFailed)).toBe(
      ru.common.timedOut,
    );
  });

  it('обычный отказ запасную фразу не теряет', () => {
    expect(describeApiError(new ApiError(500, 'boom'), ru, ru.common.saveFailed)).toBe(
      ru.common.saveFailed,
    );
  });
});
