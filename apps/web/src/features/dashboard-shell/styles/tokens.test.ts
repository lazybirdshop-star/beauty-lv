import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { contrastRatio } from '@amolie/shared-kernel';
import { describe, expect, it } from 'vitest';

/**
 * Контраст измеряется, а не оценивается на глаз (handoff §1, принцип 9).
 *
 * Читается сам `tokens.css`: значение, которого нет в файле, здесь не
 * проверить, а пара, которой нет здесь, — не токен. Каждая пара названа той
 * поверхностью, на которой текст действительно лежит.
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

function palette(css: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const match of css.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
    values[match[1]!] = match[2]!.toLowerCase();
  }
  /* Семантические роли ссылаются на примитивы палитры: `var(--rose)` → hex. */
  for (const match of css.matchAll(/--([a-z0-9-]+):\s*var\(--([a-z0-9-]+)\)\s*;/gi)) {
    const target = values[match[2]!];
    if (target) values[match[1]!] = target;
  }
  return values;
}

const light = palette(block('.amolie-app,\n[data-surface'));
const dark = palette(block(":root[data-theme='dark'] .amolie-app"));

type Pair = [foreground: string, background: string, floor: number];

/** Текст ≥ 4.5, графика и крупный текст ≥ 3 — WCAG 2.2 AA. */
const LIGHT_PAIRS: Pair[] = [
  ['ink', 'bg', 4.5],
  ['ink', 'bg-raised', 4.5],
  ['ink', 'bg-inset', 4.5],
  ['ink', 'bg-free', 4.5],
  ['ink-soft', 'bg', 4.5],
  ['ink-soft', 'bg-inset', 4.5],
  ['ink-faint', 'bg', 4.5],
  ['ink-faint', 'bg-raised', 4.5],
  ['ink-faint', 'bg-inset', 4.5],
  ['ink-faint', 'bg-sunken', 4.5],
  ['ink-faint', 'bg-free', 4.5],
  ['accent-contrast', 'accent', 4.5],
  ['accent-ink', 'bg-free', 4.5],
  ['accent-ink', 'bg', 4.5],
  ['accent-ink', 'bg-raised', 4.5],
  ['accent', 'bg-raised', 3],
  ['accent', 'bg-inset', 3],
  ['success-ink', 'bg-inset', 4.5],
  ['success-ink', 'bg-raised', 4.5],
  ['success-contrast', 'success-fill', 4.5],
  ['success', 'bg-inset', 3],
  ['warning-ink', 'bg-inset', 4.5],
  ['warning-ink', 'bg', 4.5],
  ['warning-ink', 'bg-raised', 4.5],
  ['warning', 'bg-raised', 3],
  ['danger', 'bg-raised', 4.5],
  ['danger', 'bg', 4.5],
  ['danger-contrast', 'danger', 4.5],
  ['service-rose', 'bg-inset', 3],
  ['service-sage', 'bg-inset', 3],
  ['service-clay', 'bg-inset', 3],
  ['service-slate', 'bg-inset', 3],
];

const DARK_PAIRS: Pair[] = [
  ['ink', 'bg', 4.5],
  ['ink', 'bg-raised', 4.5],
  ['ink', 'bg-lifted', 4.5],
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
  ['warning-ink', 'bg-raised', 4.5],
  ['warning-ink', 'bg-inset', 4.5],
  ['danger', 'bg-raised', 4.5],
  ['danger-contrast', 'danger', 4.5],
  ['service-rose', 'bg-inset', 3],
  ['service-sage', 'bg-inset', 3],
  ['service-clay', 'bg-inset', 3],
  ['service-slate', 'bg-inset', 3],
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
  check(light, LIGHT_PAIRS);
});

describe('tokens.css — тёмная тема', () => {
  check(dark, DARK_PAIRS);
});

describe('tokens.css — форма', () => {
  it('контрол — пилюля, поле — ниша без рамки', () => {
    expect(light['control-radius']).toBeUndefined();
    expect(source).toMatch(/--control-radius:\s*999px/);
    expect(source).toMatch(/--field-border-width:\s*0px/);
  });
});
