/** Постгресовый код нарушения уникального индекса. */
const UNIQUE_VIOLATION = '23505';

/**
 * Нарушение уникального индекса — по какому бы слою оно ни поднялось.
 *
 * Драйвер `pg` кладёт код в сам объект ошибки, а drizzle с некоторых версий
 * оборачивает его в `DrizzleQueryError` и убирает исходную ошибку в `cause`.
 * Четыре копии этой проверки по проекту смотрели только на верхний объект — и
 * после обновления драйвера перестали срабатывать все разом, молча: ветка
 * «такой уже есть» не выполнялась, наружу уходил 500, и мастер вместо
 * «клиент с таким номером уже есть в списке» получала «внутреннюю ошибку».
 *
 * Отсюда две вещи. Первая — цепочка `cause` разматывается, а не проверяется
 * один уровень. Вторая — проверка живёт в одном месте: расхождение четырёх
 * копий и было тем, что позволило дефекту пролежать незамеченным.
 */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  for (const link of causeChain(error)) {
    const { code, constraint: violated } = link as { code?: string; constraint?: string };
    if (code !== UNIQUE_VIOLATION) continue;
    /* Без имени индекса подходит любое нарушение; с именем — только своё.
       Регистрация полагается на второе: почта, телефон и адрес страницы дают
       три разных ответа человеку. */
    if (constraint === undefined || violated === constraint) return true;
  }
  return false;
}

/**
 * Ошибка и всё, что она под собой прячет.
 *
 * Глубина ограничена: `cause` — обычное поле, и ничто не мешает ему
 * закольцеваться на объекте, пришедшем со стороны.
 */
function* causeChain(error: unknown, depth = 5): Generator<object> {
  let current = error;
  for (let step = 0; step <= depth; step += 1) {
    if (typeof current !== 'object' || current === null) return;
    yield current;
    current = (current as { cause?: unknown }).cause;
  }
}
