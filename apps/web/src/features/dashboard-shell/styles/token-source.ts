/**
 * Разбор `tokens.css` для тестов: и контраст кабинета, и сверка копии токенов
 * на лендинге читают один и тот же файл и должны понимать его одинаково.
 *
 * С 2026-09-24 пара значений темы живёт в одном объявлении
 * `light-dark(день, ночь)`, поэтому разбор обязан уметь брать нужную
 * половину. Раньше каждый тест разбирал файл сам, и достаточно было одному
 * отстать, чтобы он молча мерил не то.
 */

export type Theme = 'light' | 'dark';

/** Разбить список аргументов по запятым верхнего уровня. */
export function splitTop(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of value) {
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  parts.push(current.trim());
  return parts;
}

/** Половина объявления, отвечающая за тему: `light-dark(a, b)` → a или b. */
export function side(value: string, theme: Theme): string {
  const trimmed = value.trim();
  const match = /^light-dark\(([\s\S]*)\)$/.exec(trimmed);
  if (!match) return trimmed;
  const args = splitTop(match[1]!);
  if (args.length !== 2) throw new Error(`light-dark expects two values: ${trimmed}`);
  return (theme === 'light' ? args[0]! : args[1]!).trim();
}

/** Объявления `--имя: значение;` внутри тела правила, уже без обёртки темы. */
export function declarations(body: string, theme: Theme): Map<string, string> {
  const out = new Map<string, string>();
  for (const match of body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/gi)) {
    /* Перенос строки внутри значения — вопрос форматирования, а не смысла:
       длинная тень в `tokens.css` перенесена, в копии лендинга — нет. */
    const value = side(match[2]!, theme).replace(/\s+/g, ' ').toLowerCase();
    out.set(match[1]!, value);
  }
  return out;
}

/**
 * Разрешить ссылки `var(--x)` внутри карты. Ссылка на ссылку разрешается
 * тоже: роли кабинета ссылаются на примитивы, а исходы визита — на роли.
 */
export function resolveRefs(values: Map<string, string>): Map<string, string> {
  const out = new Map(values);
  for (const name of out.keys()) {
    const seen = new Set<string>();
    let value = out.get(name)!;
    let ref = /^var\(--([a-z0-9-]+)\)$/.exec(value);
    while (ref && !seen.has(ref[1]!)) {
      seen.add(ref[1]!);
      const target = out.get(ref[1]!);
      if (!target) break;
      value = target;
      ref = /^var\(--([a-z0-9-]+)\)$/.exec(value);
    }
    out.set(name, value);
  }
  return out;
}

/**
 * Значения области кабинета для одной темы: все правила верхнего уровня,
 * начинающиеся с `.amolie-app,`. Вложенные в `@media` (телефон) начинаются с
 * отступа и сюда не попадают.
 */
export function scopeTokens(source: string, theme: Theme): Map<string, string> {
  const values = new Map<string, string>();
  for (const match of source.matchAll(/\n\.amolie-app,\n\[data-surface[^{]*\{([\s\S]*?)\n\}/g)) {
    for (const [name, value] of declarations(match[1]!, theme)) values.set(name, value);
  }
  return resolveRefs(values);
}
