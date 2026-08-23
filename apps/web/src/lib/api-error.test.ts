import { describe, expect, it } from 'vitest';

import { ApiError, errorField } from './api-error';

/**
 * Ошибка API на границе кабинета.
 *
 * `message` — фраза, написанная сервером по-русски, а панель говорит на трёх
 * языках. Поэтому отказы, которые интерфейсу нужно **объяснить** (занятый
 * адрес, мастер, переехавший на новый), несут рядом машиночитаемое поле, и
 * `errorField` — единственный разрешённый способ его достать. Всё, что он
 * обязан уметь, — не падать ни на чём, что может прийти по сети.
 */

describe('ApiError — что он про себя знает', () => {
  it('несёт статус, фразу и разобранное тело', () => {
    const error = new ApiError(409, 'Адрес занят', { slug: 'anna' });

    expect(error.status).toBe(409);
    expect(error.message).toBe('Адрес занят');
    expect(error.body).toEqual({ slug: 'anna' });
  });

  it('остаётся настоящей ошибкой — с именем и стеком', () => {
    const error = new ApiError(500, 'Что-то пошло не так');

    // `instanceof` здесь не формальность: `catch` в экранах разбирает ошибку
    // именно им, и потеря прототипа увела бы весь разбор в ветку «неизвестно».
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.name).toBe('ApiError');
    expect(typeof error.stack).toBe('string');
  });

  it('тело необязательно — сервер вправе ответить не-JSON', () => {
    expect(new ApiError(502, 'Bad gateway').body).toBeUndefined();
  });
});

describe('errorField — достаёт одно поле и никогда не падает', () => {
  it('возвращает строку, когда она есть', () => {
    const error = new ApiError(409, 'Занято', { slug: 'anna-nails' });

    expect(errorField(error, 'slug')).toBe('anna-nails');
  });

  it('молчит про поле, которого в теле нет', () => {
    expect(errorField(new ApiError(409, 'Занято', { slug: 'anna' }), 'movedTo')).toBeNull();
  });

  it('нестроковое значение — не значение: null, а не число и не объект', () => {
    // Читатель этого поля подставляет его прямо в разметку. Пустить туда
    // объект — получить «[object Object]» на экране мастера.
    const error = new ApiError(409, 'Занято', { slug: 42, nested: { slug: 'x' } });

    expect(errorField(error, 'slug')).toBeNull();
    expect(errorField(error, 'nested')).toBeNull();
  });

  it('тело не объект — null, а не исключение поверх исключения', () => {
    expect(errorField(new ApiError(500, 'boom', 'plain text'), 'slug')).toBeNull();
    expect(errorField(new ApiError(500, 'boom', null), 'slug')).toBeNull();
    expect(errorField(new ApiError(500, 'boom'), 'slug')).toBeNull();
  });

  it('чужая ошибка — не ApiError, и разбирать в ней нечего', () => {
    // В `catch` попадает что угодно: сетевой сбой, TypeError из-за опечатки,
    // строка из старого кода. Ни один из этих случаев не должен уронить экран.
    expect(errorField(new Error('offline'), 'slug')).toBeNull();
    expect(errorField('строка', 'slug')).toBeNull();
    expect(errorField(undefined, 'slug')).toBeNull();
    expect(errorField(null, 'slug')).toBeNull();
    expect(errorField({ body: { slug: 'anna' } }, 'slug')).toBeNull();
  });

  it('массив в теле — тоже объект, но именованного поля в нём нет', () => {
    expect(errorField(new ApiError(400, 'boom', ['slug']), 'slug')).toBeNull();
  });
});
