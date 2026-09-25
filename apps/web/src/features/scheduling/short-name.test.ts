import { describe, expect, it } from 'vitest';

import { shortClientName } from './short-name';

describe('shortClientName', () => {
  it('сокращает фамилию до инициала', () => {
    expect(shortClientName('Viktorija Sokolova')).toBe('Viktorija S.');
  });

  it('имя из одного слова не трогает', () => {
    expect(shortClientName('Anna')).toBe('Anna');
  });

  it('отбрасывает всё после второго слова', () => {
    expect(shortClientName('Anna Maria Kalniņa')).toBe('Anna M.');
  });

  it('держит диакритику и нелатинские буквы', () => {
    expect(shortClientName('Elīna Vītola')).toBe('Elīna V.');
    expect(shortClientName('Анна Каленина')).toBe('Анна К.');
  });

  it('не ломается на пустом и на лишних пробелах', () => {
    expect(shortClientName('')).toBe('');
    expect(shortClientName('   ')).toBe('');
    expect(shortClientName('  Marta   Bērziņa  ')).toBe('Marta B.');
  });
});
