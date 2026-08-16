import { describe, expect, it } from 'vitest';

import { urlBase64ToBytes } from './subscription';

/**
 * Ключ VAPID приходит в base64url — алфавите, где `+` и `/` заменены на `-` и
 * `_`, а выравнивание `=` отброшено. Ошибка здесь не падает, а тихо портит
 * ключ: подписка оформится, а уведомления не придут никогда. Поэтому проверка
 * идёт против обычного base64, посчитанного независимо.
 */
describe('urlBase64ToBytes', () => {
  it('переводит base64url в те же байты, что и обычный base64', () => {
    const bytes = Uint8Array.from({ length: 65 }, (_, index) => (index * 7) % 256);
    const base64 = Buffer.from(bytes).toString('base64');
    const base64Url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    expect(urlBase64ToBytes(base64Url)).toEqual(bytes);
  });

  it('восстанавливает отброшенное выравнивание', () => {
    // «AQID» — ровно четыре символа, выравнивать нечего; «AQI» требует одного «=».
    expect(urlBase64ToBytes('AQID')).toEqual(new Uint8Array([1, 2, 3]));
    expect(urlBase64ToBytes('AQI')).toEqual(new Uint8Array([1, 2]));
  });

  it('не путает символы base64url с базовыми', () => {
    // Байты 0xFB 0xFF дают «-_8» в base64url и «+/8» в обычном base64.
    expect(urlBase64ToBytes('-_8')).toEqual(new Uint8Array([251, 255]));
  });
});
