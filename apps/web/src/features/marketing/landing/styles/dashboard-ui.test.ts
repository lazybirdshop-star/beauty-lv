import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { declarations, scopeTokens } from '../../../dashboard-shell/styles/token-source';

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

/** Тело первого правила, начинающегося с `selector` с начала строки. */
function firstBlock(source: string, selector: string): string {
  const at = source.indexOf(`\n${selector}`);
  if (at === -1) throw new Error(`no block starting with ${selector}`);
  const open = source.indexOf('{', at);
  return source.slice(open + 1, source.indexOf('\n}', open));
}

/** Собственные ручки мокапа, которых у кабинета нет. */
const OWN = new Set(['dash-font', 'dash-figure']);

describe('мокапы кабинета на лендинге', () => {
  const light = scopeTokens(dashboard, 'light');
  const copied = [...declarations(firstBlock(mock, '.ui--dash,'), 'light')].filter(
    ([name]) => !OWN.has(name),
  );

  it('повторяют заметную часть палитры кабинета', () => {
    expect(copied.length).toBeGreaterThan(30);
  });

  it.each(copied)('--%s совпадает с tokens.css кабинета', (name, value) => {
    expect(light.get(name)).toBe(value);
  });
});
