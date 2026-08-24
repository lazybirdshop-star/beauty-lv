import { isUniqueViolation } from './unique-violation';

/**
 * Нарушение уникального индекса, поднявшееся через слои драйвера.
 *
 * Тест написан по живому отказу: drizzle обернул ошибку `pg` в
 * `DrizzleQueryError` и убрал исходную в `cause`, а четыре копии проверки по
 * проекту смотрели только на верхний объект. Ветка «такой уже есть» перестала
 * выполняться разом во всех четырёх, молча: наружу пошёл 500, и мастер вместо
 * «клиент с таким номером уже есть в списке» получила «внутреннюю ошибку».
 */

/** Ошибка `pg` — код лежит на самом объекте. */
function pgError(constraint?: string) {
  return Object.assign(new Error('duplicate key value violates unique constraint'), {
    code: '23505',
    ...(constraint ? { constraint } : {}),
  });
}

/** Обёртка drizzle — исходная ошибка ушла в `cause`. */
function wrapped(cause: unknown, depth = 1): unknown {
  let current = cause;
  for (let i = 0; i < depth; i += 1) {
    current = Object.assign(new Error('Failed query'), { cause: current });
  }
  return current;
}

describe('isUniqueViolation — где лежит код', () => {
  it('узнаёт голую ошибку драйвера', () => {
    expect(isUniqueViolation(pgError())).toBe(true);
  });

  it('узнаёт её же под обёрткой drizzle', () => {
    // Ровно тот случай, который сломался после обновления драйвера.
    expect(isUniqueViolation(wrapped(pgError()))).toBe(true);
  });

  it('разматывает несколько уровней, а не один', () => {
    expect(isUniqueViolation(wrapped(pgError(), 3))).toBe(true);
  });

  it('останавливается на разумной глубине и не виснет', () => {
    expect(isUniqueViolation(wrapped(pgError(), 50))).toBe(false);
  });

  it('закольцованная цепочка не уводит в вечный цикл', () => {
    const looped: { cause?: unknown } = {};
    looped.cause = looped;

    expect(isUniqueViolation(looped)).toBe(false);
  });
});

describe('isUniqueViolation — что не является дублем', () => {
  it('другой код ошибки — не дубль', () => {
    expect(isUniqueViolation(Object.assign(new Error('nope'), { code: '23503' }))).toBe(false);
  });

  it('ошибка без кода — не дубль', () => {
    expect(isUniqueViolation(new Error('offline'))).toBe(false);
  });

  it('не-объект не роняет проверку', () => {
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
    expect(isUniqueViolation('23505')).toBe(false);
  });
});

describe('isUniqueViolation — с именем индекса', () => {
  it('своё нарушение узнаётся', () => {
    expect(isUniqueViolation(pgError('users_email_unique'), 'users_email_unique')).toBe(true);
  });

  it('чужое — нет: почта, телефон и адрес страницы отвечают разными словами', () => {
    expect(isUniqueViolation(pgError('users_phone_unique'), 'users_email_unique')).toBe(false);
  });

  it('имя ищется и под обёрткой', () => {
    expect(isUniqueViolation(wrapped(pgError('users_email_unique')), 'users_email_unique')).toBe(
      true,
    );
  });

  it('без имени подходит любое нарушение уникальности', () => {
    expect(isUniqueViolation(pgError('clients_organization_id_phone_unique'))).toBe(true);
  });
});
