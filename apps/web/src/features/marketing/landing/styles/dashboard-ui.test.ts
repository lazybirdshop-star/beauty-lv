import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Мокапы кабинета на лендинге рисуются повтором токенов кабинета, а не их
 * подключением (причина — в шапке `dashboard-ui.css`: тёмная тема кабинета
 * перекрасила бы мокапы на бумажной странице). Повтор допустим, только пока
 * он не расходится с источником: кабинет сменит палитру — этот тест упадёт,
 * и лендинг не останется показывать прежний продукт.
 */
const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

const mock = read('./dashboard-ui.css');
const dashboard = read('../../../dashboard-shell/styles/tokens.css');

/** Объявления `--имя: значение;` внутри тела правила. */
function declarations(body: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const match of body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/gi)) {
    out.set(match[1]!, match[2]!.trim().toLowerCase());
  }
  return out;
}

/** Тело первого правила, начинающегося с `selector` с начала строки. */
function firstBlock(source: string, selector: string): string {
  const at = source.indexOf(`\n${selector}`);
  if (at === -1) throw new Error(`no block starting with ${selector}`);
  const open = source.indexOf('{', at);
  return source.slice(open + 1, source.indexOf('\n}', open));
}

/**
 * Светлые значения кабинета: все правила верхнего уровня его области.
 * Вложенные в `@media` (телефон, ночь) начинаются с отступа и сюда не
 * попадают, тёмные начинаются с `:root[data-theme='dark']` — тоже.
 */
function dashboardLight(): Map<string, string> {
  const values = new Map<string, string>();
  for (const match of dashboard.matchAll(/\n\.amolie-app,\n\[data-surface[^{]*\{([\s\S]*?)\n\}/g)) {
    for (const [name, value] of declarations(match[1]!)) values.set(name, value);
  }
  /* Роли ссылаются на примитивы: `--ink: var(--cocoa)` → значение примитива. */
  for (const [name, value] of values) {
    const ref = /^var\(--([a-z0-9-]+)\)$/.exec(value);
    const target = ref ? values.get(ref[1]!) : undefined;
    if (target) values.set(name, target);
  }
  return values;
}

/** Собственные ручки мокапа, которых у кабинета нет. */
const OWN = new Set(['dash-font', 'dash-figure']);

describe('мокапы кабинета на лендинге', () => {
  const light = dashboardLight();
  const copied = [...declarations(firstBlock(mock, '.ui--dash,'))].filter(
    ([name]) => !OWN.has(name),
  );

  it('повторяют заметную часть палитры кабинета', () => {
    expect(copied.length).toBeGreaterThan(30);
  });

  it.each(copied)('--%s совпадает с tokens.css кабинета', (name, value) => {
    expect(light.get(name)).toBe(value);
  });
});
