import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { contrastRatio } from '@amolie/shared-kernel';
import { describe, expect, it } from 'vitest';

import { declarations, resolveRefs, type Theme } from './token-source';

/**
 * Контраст измеряется, а не оценивается на глаз (handoff §1, принцип 9).
 *
 * Читается сам `tokens.css`: значение, которого нет в файле, здесь не
 * проверить, а пара, которой нет здесь, — не токен. Каждая пара названа той
 * поверхностью, на которой текст действительно лежит.
 *
 * С 2026-09-24 обе темы живут в одном объявлении `light-dark(день, ночь)`,
 * поэтому и разбор один: значение раскладывается на две половины, ссылки
 * `var(--x)` разрешаются внутри своей половины, и дальше светлая и тёмная
 * карты проверяются одинаково. Раньше ночь читалась из отдельного блока и
 * могла молча разойтись со днём.
 */
const source = readFileSync(fileURLToPath(new URL('./tokens.css', import.meta.url)), 'utf8');

/** Блок — от селектора до закрывающей скобки первого уровня. */
function block(selectorStart: string): string {
  const at = source.indexOf(selectorStart);
  if (at === -1) throw new Error(`no block starting with ${selectorStart}`);
  const open = source.indexOf('{', at);
  const close = source.indexOf('\n}', open);
  return source.slice(open, close);
}

/**
 * Карта «имя токена → шестнадцатеричный цвет» для одной темы. Токены, чьё
 * значение не сводится к цвету (размеры, тени, шрифты), в карту не попадают —
 * их здесь и не меряют.
 */
function palette(css: string, theme: Theme): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [name, value] of resolveRefs(declarations(css, theme))) {
    if (/^#[0-9a-f]{6}$/i.test(value)) values[name] = value.toLowerCase();
  }
  return values;
}

const tokens = block('.amolie-app,\n[data-surface');
const light = palette(tokens, 'light');
const dark = palette(tokens, 'dark');

type Pair = [foreground: string, background: string, floor: number];

/** Пары, которые обязаны держаться в обеих темах. Текст ≥ 4.5, графика ≥ 3. */
const SHARED_PAIRS: Pair[] = [
  ['ink', 'bg', 4.5],
  ['ink', 'bg-raised', 4.5],
  ['ink', 'bg-inset', 4.5],
  ['ink', 'bg-free', 4.5],
  ['ink-soft', 'bg-raised', 4.5],
  ['ink-faint', 'bg', 4.5],
  ['ink-faint', 'bg-raised', 4.5],
  ['ink-faint', 'bg-inset', 4.5],
  ['ink-faint', 'bg-sunken', 4.5],
  ['accent-contrast', 'accent', 4.5],
  ['accent-ink', 'bg-free', 4.5],
  ['accent-ink', 'bg-raised', 4.5],
  ['success-ink', 'bg-raised', 4.5],
  ['success-contrast', 'success-fill', 4.5],
  ['success-ink', 'success-soft', 4.5],
  ['warning-ink', 'bg-raised', 4.5],
  ['warning-ink', 'bg-inset', 4.5],
  ['warning-ink', 'warning-soft', 4.5],
  ['danger-ink', 'danger-soft', 4.5],
  ['danger', 'bg-raised', 4.5],
  ['danger-contrast', 'danger', 4.5],
  /* Исход визита читается пилюлей на своей подложке — в каждой строке
     списка записей и в карточке клиента. */
  ['status-done-ink', 'status-done-soft', 4.5],
  ['status-cancelled-ink', 'status-cancelled-soft', 4.5],
  ['status-waiting-ink', 'status-waiting-soft', 4.5],
  ['status-silent-ink', 'status-silent-soft', 4.5],
  ['status-noshow-ink', 'status-noshow-soft', 4.5],
  /* Тон человека — графика: точка у имени, полоса колонки, кольцо портрета. */
  ['tone-1-ink', 'tone-1-soft', 4.5],
  ['tone-2-ink', 'tone-2-soft', 4.5],
  ['tone-3-ink', 'tone-3-soft', 4.5],
  ['tone-4-ink', 'tone-4-soft', 4.5],
  ['tone-5-ink', 'tone-5-soft', 4.5],
  ['tone-6-ink', 'tone-6-soft', 4.5],
  /* Чернильная плита и крупная подложка «нужен ответ» — свои поверхности,
     и текст на них меряется отдельно: роль поверхности им не подходит. */
  ['slab-ink', 'slab', 4.5],
  ['slab-accent', 'slab', 4.5],
  ['ink', 'surface-attention', 4.5],
  ['ink-soft', 'surface-attention', 4.5],
  ['service-rose', 'bg-inset', 3],
  ['service-sage', 'bg-inset', 3],
  ['service-clay', 'bg-inset', 3],
  ['service-slate', 'bg-inset', 3],
];

/** Пары, которые есть только днём: ночью роль лежит на другой поверхности. */
const LIGHT_ONLY_PAIRS: Pair[] = [
  ['ink-soft', 'bg', 4.5],
  ['ink-soft', 'bg-inset', 4.5],
  ['ink-faint', 'bg-free', 4.5],
  ['accent-ink', 'bg', 4.5],
  ['accent', 'bg-raised', 3],
  ['accent', 'bg-inset', 3],
  ['success-ink', 'bg-inset', 4.5],
  ['success', 'bg-inset', 3],
  ['warning-ink', 'bg', 4.5],
  ['warning', 'bg-raised', 3],
  ['danger', 'bg', 4.5],
];

const DARK_ONLY_PAIRS: Pair[] = [
  ['ink', 'bg-lifted', 4.5],
  ['ink-soft', 'bg-lifted', 4.5],
  ['ink-faint', 'bg-lifted', 4.5],
];

function check(values: Record<string, string>, pairs: Pair[]) {
  for (const [foreground, background, floor] of pairs) {
    it(`${foreground} on ${background} ≥ ${floor}:1`, () => {
      const fg = values[foreground];
      const bg = values[background];
      expect(fg, `token --${foreground} is not a hex value`).toBeDefined();
      expect(bg, `token --${background} is not a hex value`).toBeDefined();
      const ratio = contrastRatio(fg!, bg!);
      expect(ratio, `${fg} on ${bg}`).not.toBeNull();
      expect(ratio!).toBeGreaterThanOrEqual(floor);
    });
  }
}

describe('tokens.css — светлая тема', () => {
  check(light, [...SHARED_PAIRS, ...LIGHT_ONLY_PAIRS]);
});

describe('tokens.css — тёмная тема', () => {
  check(dark, [...SHARED_PAIRS, ...DARK_ONLY_PAIRS]);
});

describe('tokens.css — форма', () => {
  it('контрол — пилюля, поле — ниша без рамки', () => {
    expect(light['control-radius']).toBeUndefined();
    expect(source).toMatch(/--control-radius:\s*999px/);
    expect(source).toMatch(/--field-border-width:\s*0px/);
  });

  it('тема живёт в одном объявлении, а не в двух блоках', () => {
    /* Прежние дубли ночных значений — источник расхождения тем. */
    expect(source).not.toMatch(/:root\[data-theme='dark'\] \.amolie-app[^{]*\{[^}]*--bg:/);
    expect(source).toMatch(/color-scheme: light dark/);
  });

  it('ночь отделяет материал кромкой, а не только тенью', () => {
    expect(source).toMatch(/--cell-edge:\s*light-dark\(transparent,/);
  });
});
