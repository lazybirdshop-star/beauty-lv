export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    /**
     * The parsed error body, when the API sent JSON.
     *
     * `message` is a sentence written by the server, in Russian, and the panel
     * speaks three languages — so failures that the interface has to *explain*
     * (a taken address, a master who moved to a new one) carry a machine-
     * readable field beside the prose. Kept as `unknown`: every reader
     * narrows the one field it knows about, and none of them can pretend to
     * know the shape of an arbitrary error.
     */
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Ответа не было вовсе: время вышло раньше, чем сервер ответил.
 *
 * Отдельный тип, а не `ApiError` со статусом: у этого отказа нет статуса —
 * и, что важнее, нет ответа на вопрос «дошло ли». Запрос мог отработать на
 * сервере целиком, и сказать после него «не сохранилось» значит соврать в
 * ту сторону, где мастер нажмёт второй раз и заведёт дубликат.
 */
export class RequestTimeoutError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = 'RequestTimeoutError';
  }
}

/** Отказ, после которого неизвестно, дошёл ли запрос до сервера. */
export function isTimeoutFailure(error: unknown): boolean {
  return (
    error instanceof RequestTimeoutError || (error instanceof ApiError && error.status === 504)
  );
}

/** One named field out of an error body, when it is a string. */
export function errorField(error: unknown, field: string): string | null {
  if (!(error instanceof ApiError)) return null;
  if (typeof error.body !== 'object' || error.body === null) return null;
  const value = (error.body as Record<string, unknown>)[field];
  return typeof value === 'string' ? value : null;
}
