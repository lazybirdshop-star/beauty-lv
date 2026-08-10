import { describe, expect, it } from 'vitest';

import { DESIGN_WORLD_GROUPS } from './design-worlds';

describe('DESIGN_WORLD_GROUPS — каталог по мирам (M8)', () => {
  it('коллекция закрыта на пяти мирах', () => {
    expect(DESIGN_WORLD_GROUPS.map((group) => group.worldKey)).toEqual([
      'soft',
      'minimal',
      'luxury',
      'neo-glass',
      'poster',
    ]);
  });

  it('школа soft собирает три брендовых ключа и классику', () => {
    /* Постоянный шеринг, а не алиас миграции: editorial и organic рендерятся
       композицией soft по решению M8 и стоят в каталоге рядом с ней. */
    const soft = DESIGN_WORLD_GROUPS.find((group) => group.worldKey === 'soft');
    expect(soft?.keys).toEqual(
      expect.arrayContaining(['soft-studio', 'editorial', 'organic', 'soft']),
    );
  });

  it('миры с собственной композицией стоят по одному', () => {
    for (const key of ['minimal', 'luxury', 'neo-glass']) {
      const group = DESIGN_WORLD_GROUPS.find((entry) => entry.worldKey === key);
      expect(group?.keys).toEqual([key]);
    }
  });

  it('каждый ключ оформления попал ровно в один мир', () => {
    const all = DESIGN_WORLD_GROUPS.flatMap((group) => group.keys);
    expect(new Set(all).size).toBe(all.length);
    expect(all).toHaveLength(8);
  });
});
