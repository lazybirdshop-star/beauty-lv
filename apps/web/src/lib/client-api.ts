import { ApiError } from './api-error';

/**
 * For Client Components (React Query hooks) — goes through the same-origin
 * `/api/proxy`, never touches the access token directly.
 */
export async function clientApiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/proxy${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });

  if (!response.ok) {
    const { message, body } = await readError(response);
    throw new ApiError(response.status, message, body);
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
