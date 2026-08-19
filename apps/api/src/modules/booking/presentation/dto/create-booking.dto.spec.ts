import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { FIELD_LIMITS } from '../../../../shared/validation/field-limits';
import { CreateBookingDto } from './create-booking.dto';

/**
 * Границы того, что вообще доходит до логики записи.
 *
 * Это не формальность: тот же DTO стоит на `POST :slug/public-bookings`, куда
 * приходит аноним без токена. Каждое правило здесь — ограничение на то, что
 * незнакомый человек может сохранить под аккаунтом мастера, а `whitelist` +
 * `forbidNonWhitelisted` в `main.ts` означают, что всё неописанное просто не
 * существует.
 */

const SLOT_ID = '22222222-2222-4222-8222-222222222222';
const SERVICE_ID = '33333333-3333-4333-8333-333333333333';

function validate(payload: Record<string, unknown>) {
  return validateSync(plainToInstance(CreateBookingDto, payload), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
}

function failedFields(payload: Record<string, unknown>): string[] {
  return validate(payload).map((error) => error.property);
}

function valid(overrides: Record<string, unknown> = {}) {
  return {
    publishedSlotId: SLOT_ID,
    serviceIds: [SERVICE_ID],
    guestName: 'Анна',
    guestPhone: '+37120000000',
    ...overrides,
  };
}

describe('CreateBookingDto — минимально достаточная запись', () => {
  it('пропускает запись на опубликованное окно', () => {
    expect(validate(valid())).toHaveLength(0);
  });

  it('пропускает запись на названное мастером время', () => {
    // Клиент попросил час, который мастер никому не открывала: она вправе
    // назвать момент вместо окна.
    expect(
      validate(valid({ publishedSlotId: undefined, startsAt: '2026-09-01T10:00:00.000Z' })),
    ).toHaveLength(0);
  });

  it('пропускает все необязательные поля разом', () => {
    expect(
      validate(
        valid({
          guestEmail: 'anna@example.com',
          guestInstagram: '@anna',
          notes: 'Придёт с подругой',
        }),
      ),
    ).toHaveLength(0);
  });
});

describe('CreateBookingDto — услуги', () => {
  it('без услуг записи нет', () => {
    expect(failedFields(valid({ serviceIds: [] }))).toContain('serviceIds');
  });

  it('услуга должна быть идентификатором, а не любой строкой', () => {
    expect(failedFields(valid({ serviceIds: ['маникюр'] }))).toContain('serviceIds');
  });

  it('десять услуг — ещё запись', () => {
    const ten = Array.from({ length: 10 }, () => SERVICE_ID);

    expect(validate(valid({ serviceIds: ten }))).toHaveLength(0);
  });

  it('одиннадцать — уже попытка забить календарь', () => {
    // Визит из одиннадцати услуг блокирует окна на полдня и дальше; настоящая
    // корзина до такого не доходит.
    const eleven = Array.from({ length: 11 }, () => SERVICE_ID);

    expect(failedFields(valid({ serviceIds: eleven }))).toContain('serviceIds');
  });

  it('строка вместо списка списком не считается', () => {
    expect(failedFields(valid({ serviceIds: SERVICE_ID }))).toContain('serviceIds');
  });
});

describe('CreateBookingDto — кто записывается', () => {
  it('имени короче двух букв не бывает', () => {
    expect(failedFields(valid({ guestName: 'А' }))).toContain('guestName');
  });

  it('без имени запись не принимается', () => {
    expect(failedFields(valid({ guestName: undefined }))).toContain('guestName');
  });

  it('без телефона тоже — мастеру нечем связаться', () => {
    expect(failedFields(valid({ guestPhone: undefined }))).toContain('guestPhone');
  });

  it('огрызок вместо телефона не проходит', () => {
    expect(failedFields(valid({ guestPhone: '+371' }))).toContain('guestPhone');
  });

  it('почта проверяется как почта', () => {
    expect(failedFields(valid({ guestEmail: 'не почта' }))).toContain('guestEmail');
  });
});

describe('CreateBookingDto — потолки на текст', () => {
  it.each([
    ['guestName', FIELD_LIMITS.name],
    ['guestPhone', FIELD_LIMITS.phone],
    ['guestInstagram', FIELD_LIMITS.handle],
    ['notes', FIELD_LIMITS.longText],
  ])('%s не длиннее своего предела', (field, limit) => {
    // Каждая текстовая колонка здесь — Postgres `text`, у которого своей длины
    // нет: единственный потолок — этот. Без него один запрос анонима сохраняет
    // мегабайты под аккаунтом мастера.
    expect(validate(valid({ [field]: 'я'.repeat(limit) }))).toHaveLength(0);
    expect(failedFields(valid({ [field]: 'я'.repeat(limit + 1) }))).toContain(field);
  });

  it('почта не длиннее адреса, который вообще бывает', () => {
    const local = 'a'.repeat(FIELD_LIMITS.email - '@example.com'.length + 1);

    expect(failedFields(valid({ guestEmail: `${local}@example.com` }))).toContain('guestEmail');
  });
});

describe('CreateBookingDto — что не описано, того не существует', () => {
  it('чужое поле в теле запроса отклоняется целиком', () => {
    // `forbidNonWhitelisted` в main.ts: попытка выставить себе статус или
    // организацию не должна молча игнорироваться — она должна быть отказом.
    expect(failedFields(valid({ status: 'confirmed' }))).toContain('status');
    expect(failedFields(valid({ organizationId: 'чужая' }))).toContain('organizationId');
  });

  it('окно должно быть идентификатором окна', () => {
    expect(failedFields(valid({ publishedSlotId: 'первое свободное' }))).toContain(
      'publishedSlotId',
    );
  });

  it('время должно быть датой', () => {
    expect(failedFields(valid({ publishedSlotId: undefined, startsAt: 'завтра' }))).toContain(
      'startsAt',
    );
  });

  /*
   * Оба поля отсутствуют — DTO это пропускает, и намеренно: «окно или момент»
   * — правило записи, а не формы, и живёт оно там, где известен контекст.
   * Гостю `GuestBookingService` отвечает «нужно выбрать окно» (произвольное
   * время — привилегия мастера), мастеру `BookingsRepository` отвечает «окно
   * не найдено». Тест закрепляет разделение: если правило когда-нибудь
   * переедет в DTO, гость начнёт получать другую ошибку, и это должно быть
   * решением, а не побочным эффектом.
   */
  it('ни окна, ни времени — вопрос не формы, а логики записи', () => {
    expect(validate(valid({ publishedSlotId: undefined }))).toHaveLength(0);
  });
});
