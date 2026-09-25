import { describe, expect, it } from 'vitest';

import { metaLine } from './meta-line';

describe('metaLine', () => {
  it('клеит разделитель к предыдущему слову неразрывным пробелом', () => {
    expect(metaLine('Педикюр', 'Maija')).toBe('Педикюр · Maija');
  });

  it('после разделителя пробел обычный — перенос там уместен', () => {
    const line = metaLine('a', 'b');
    expect(line.indexOf(' ')).toBeLessThan(line.indexOf(' ', line.indexOf('·')));
  });

  it('выбрасывает пустые части, чтобы строка не начиналась с точки', () => {
    expect(metaLine('', 'Maija')).toBe('Maija');
    expect(metaLine(null, undefined, false, 'Rasa')).toBe('Rasa');
  });

  it('числа печатает как есть', () => {
    expect(metaLine(1, '2 ч')).toBe('1 · 2 ч');
  });

  it('одна часть остаётся без разделителя', () => {
    expect(metaLine('Маникюр')).toBe('Маникюр');
  });
});
