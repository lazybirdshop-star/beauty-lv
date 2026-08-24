import { isDashboardErrorCode } from '@amolie/shared-kernel';

import { ApiError, errorField } from './api-error';
import type { Messages } from './i18n/messages';

/**
 * Отказ сервера, сказанный словами кабинета.
 *
 * Единственный разрешённый способ показать ошибку API мастеру. `message`
 * приходит от сервера по-русски, а панель говорит на трёх языках — и два
 * экрана печатали серверную фразу дословно: английская форма записи отвечала
 * «Это время уже прошло».
 *
 * Порядок ответа — от точного к общему:
 *
 * 1. Код, который словарь знает, — своя фраза на языке мастера.
 * 2. Код, которого словарь ещё не знает (API ушёл вперёд), — общая фраза.
 * 3. Ошибка без кода, сеть, что угодно ещё — она же.
 *
 * Серверная проза не возвращается ни в одной ветке. Это не осторожность:
 * пропустить её «пока перевода нет» значит вернуть ровно тот дефект, ради
 * которого написан этот файл.
 *
 * `fallback` — для экранов, у которых есть фраза точнее общей: форма записи
 * говорит «не удалось создать запись», а не «не получилось».
 */
export function describeApiError(error: unknown, t: Messages, fallback?: string): string {
  const code = errorField(error, 'code');
  if (isDashboardErrorCode(code)) return t.apiErrors[code];
  return fallback ?? t.common.actionFailed;
}

/**
 * Тот же разбор, но только для отказов, у которых причина названа кодом.
 *
 * Нужен там, где известная причина и неизвестная ведут себя по-разному: форма
 * записи показывает конфликт строкой под полями и оставляет шторку открытой,
 * а на неизвестном сбое честнее сказать общее «не удалось».
 */
export function apiErrorCodeOf(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null;
  const code = errorField(error, 'code');
  return isDashboardErrorCode(code) ? code : null;
}
