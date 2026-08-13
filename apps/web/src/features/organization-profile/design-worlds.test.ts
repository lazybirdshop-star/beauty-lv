import { describe, expect, it } from 'vitest';

import { DESIGN_WORLD_GROUPS } from './design-worlds';

/**
 * Каталог предлагает не всё, что умеет рендерить: мир, чей визуал ещё
 * доводится, скрыт до готовности. Тесты стерегут именно эту границу —
 * что предложено ровно готовое, и что скрытие не превратилось в удаление.
 */
describe('DESIGN_WORLD_GROUPS — каталог по мирам (M8)', () => {
  it('сегодня предлагаются пять готовых миров', () => {
    expect(DESIGN_WORLD_GROUPS.map((group) => group.worldKey)).toEqual([
      'soft',
      'minimal',
      'aura',
      'funk',
      'poster',
    ]);
  });

  it('мир без готового визуала не показывается вовсе', () => {
    /* Luxury рендерится и живёт в данных — он лишь не предлагается, пока
       палитра и пары не доведены. */
    expect(DESIGN_WORLD_GROUPS.map((group) => group.worldKey)).not.toContain('luxury');
  });

  it('каждый предложенный ключ попал ровно в один мир', () => {
    const all = DESIGN_WORLD_GROUPS.flatMap((group) => group.keys);
    expect(new Set(all).size).toBe(all.length);
    expect(all).toEqual(['soft', 'minimal', 'aura', 'funk', 'poster']);
  });
});
