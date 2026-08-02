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
    throw new ApiError(response.status, await readErrorMessage(response));
  }

  return response.json() as Promise<T>;
}

/**
 * Nest puts the human-readable reason in `message`, so surfacing the raw
 * body would show callers `{"message":"…","statusCode":409}`. Validation
 * failures make `message` an array of field errors; the first one is the one
 * worth showing. Anything unparseable falls back to the status text.
 */
async function readErrorMessage(response: Response): Promise<string> {
  const body = await response.text();
  if (!body) return response.statusText;
  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed && typeof parsed === 'object' && 'message' in parsed) {
      const { message } = parsed as { message: unknown };
      if (typeof message === 'string') return message;
      if (Array.isArray(message) && typeof message[0] === 'string') return message[0];
    }
  } catch {
    // Not JSON — the raw body is the best we have.
  }
  return body;
}
