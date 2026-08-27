import { ApiError, RequestTimeoutError } from './api-error';
import { CLIENT_TIMEOUT_MS, isTimeoutAbort, withTimeout } from './api-timeout';

/**
 * For Client Components (React Query hooks) — goes through the same-origin
 * `/api/proxy`, never touches the access token directly.
 */
export async function clientApiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/proxy${path}`, {
      ...init,
      /* Свой сигнал уважается — см. `withTimeout`. */
      signal: withTimeout(init?.signal, CLIENT_TIMEOUT_MS),
      headers: {
        ...(init?.headers ?? {}),
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
  } catch (error) {
    if (isTimeoutAbort(error)) throw new RequestTimeoutError(CLIENT_TIMEOUT_MS);
    throw error;
  }

  if (!response.ok) {
    const { message, body } = await readError(response);
    throw new ApiError(response.status, message, body);
  }

  /*
   * `204 No Content` — законный успех, а не поломка.
   *
   * Так отвечают все действия, которым нечего вернуть: просьба о ссылке для
   * входа, отмена визита, «сохранить запись за собой». Разбор пустого тела
   * бросал `SyntaxError`, вызывающий код ловил его как сбой связи — и человек
   * видел «проверьте связь» ровно тогда, когда всё получилось: письмо ушло,
   * визит отменён. Молчание сервера теперь читается молчанием.
   */
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/**
 * Nest puts the human-readable reason in `message`, so surfacing the raw
 * body would show callers `{"message":"…","statusCode":409}`. Validation
 * failures make `message` an array of field errors; the first one is the one
 * worth showing. Anything unparseable falls back to the status text.
 *
 * The parsed object travels along beside the sentence: some failures carry a
 * code the panel needs in order to say the same thing in the master's own
 * language (see `ApiError.body`).
 */
async function readError(response: Response): Promise<{ message: string; body?: unknown }> {
  const raw = await response.text();
  if (!raw) return { message: response.statusText };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Not JSON — the raw body is the best we have.
    return { message: raw };
  }

  if (parsed && typeof parsed === 'object' && 'message' in parsed) {
    const { message } = parsed as { message: unknown };
    if (typeof message === 'string') return { message, body: parsed };
    if (Array.isArray(message) && typeof message[0] === 'string') {
      return { message: message[0], body: parsed };
    }
  }
  return { message: raw, body: parsed };
}
