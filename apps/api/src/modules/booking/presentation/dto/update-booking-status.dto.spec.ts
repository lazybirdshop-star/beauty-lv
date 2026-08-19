import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { FIELD_LIMITS } from '../../../../shared/validation/field-limits';
import { UpdateBookingStatusDto } from './update-booking-status.dto';

/**
 * Какие статусы мастер вправе поставить своей рукой.
 *
 * Первая из двух дверей: эта решает, что вообще принимается от кабинета, а
 * вторая — `STATUSES_LEADING_TO` — решает, законен ли переход из текущего
 * состояния записи. Здесь проверяется именно первая.
 */

function validate(payload: Record<string, unknown>) {
  return validateSync(plainToInstance(UpdateBookingStatusDto, payload), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
}

describe('UpdateBookingStatusDto', () => {
  it.each(['confirmed', 'completed', 'cancelled_by_master', 'no_show'] as const)(
    'мастер вправе поставить %s',
    (status) => {
      expect(validate({ status })).toHaveLength(0);
    },
  );

  it('отменить за клиента мастер не может', () => {
    // Это чужое решение. Клиентской отмены как эндпоинта пока нет вовсе, и
    // подделывать её из кабинета — значит записать мастеру чужой поступок.
    expect(validate({ status: 'cancelled_by_client' })).toHaveLength(1);
  });

  it('вернуть запись в «ждёт ответа» нельзя', () => {
    // Клиент уже увидел ответ; «неответить» его обратно невозможно.
    expect(validate({ status: 'pending' })).toHaveLength(1);
  });

  it('выдуманный статус не проходит', () => {
    expect(validate({ status: 'что-нибудь' })).toHaveLength(1);
  });

  it('без статуса запрос бессмыслен', () => {
    expect(validate({})).toHaveLength(1);
  });

  it('причина отмены необязательна', () => {
    expect(validate({ status: 'cancelled_by_master' })).toHaveLength(0);
    expect(
      validate({ status: 'cancelled_by_master', cancellationReason: 'Заболела' }),
    ).toHaveLength(0);
  });

  it('причина отмены — одна строка, а не сочинение', () => {
    expect(
      validate({
        status: 'cancelled_by_master',
        cancellationReason: 'я'.repeat(FIELD_LIMITS.shortText),
      }),
    ).toHaveLength(0);
    expect(
      validate({
        status: 'cancelled_by_master',
        cancellationReason: 'я'.repeat(FIELD_LIMITS.shortText + 1),
      }),
    ).toHaveLength(1);
  });

  it('лишние поля не проходят — цену задним числом не поправить', () => {
    expect(validate({ status: 'completed', priceAmount: 1 })).toHaveLength(1);
  });
});
