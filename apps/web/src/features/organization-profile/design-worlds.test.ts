import { describe, expect, it } from 'vitest';

import { DESIGN_WORLD_GROUPS } from './design-worlds';

/**
 * Каталог предлагает не всё, что умеет рендерить: миры, чей визуал ещё
 * доводится, скрыты до готовности. Тесты стерегут именно эту границу —
 * что предложено ровно готовое, и что скрытие не превратилось в удаление.
 */
describe('DESIGN_WORLD_GROUPS — каталог по мирам (M8)', () => {
  it('сегодня предлагаются четыре готовых мира', () => {
    expect(DESIGN_WORLD_GROUPS.map((group) => group.worldKey)).toEqual([
      'soft',
      'aura',
      'funk',
      'poster',
    ]);
  });

  it('из школы soft предложен классический ключ, а не делящие с ним композицию', () => {
    /* soft-studio, editorial и organic рендерятся той же композицией и никуда
       не делись из данных — они лишь не предлагаются, пока их палитры и пары
       не доведены. */
    const soft = DESIGN_WORLD_GROUPS.find((group) => group.worldKey === 'soft');
    expect(soft?.keys).toEqual(['soft']);
  });

  it('миры без готового визуала не показываются вовсе', () => {
    const shown = DESIGN_WORLD_GROUPS.map((group) => group.worldKey);
    for (const hidden of ['minimal', 'luxury', 'neo-glass']) {
      expect(shown).not.toContain(hidden);
    }
  });

  it('каждый предложенный ключ попал ровно в один мир', () => {
    const all = DESIGN_WORLD_GROUPS.flatMap((group) => group.keys);
    expect(new Set(all).size).toBe(all.length);
    expect(all).toEqual(['soft', 'aura', 'funk', 'poster']);
  });
});
