import { DESIGN_PRESET_KEYS, FONT_PRESET_KEYS, THEME_PRESET_KEYS } from '@amolie/shared-kernel';
import { describe, expect, it } from 'vitest';

import { en } from '@/lib/i18n/en';
import { lv } from '@/lib/i18n/lv';
import { ru } from '@/lib/i18n/messages';
import { buildMessages } from '@/lib/i18n/resolve';

import { designCopy, fontDescription, themeDescription } from './preset-copy';

/**
 * Названия и описания оформлений.
 *
 * Тексты живут здесь, а не в `shared-kernel`: тот пакет — ещё и валидатор API,
 * он владеет тем, какие ключи существуют, а не тем, как они звучат человеку.
 * Ключ палитры — данные; «Пудровый розовый» — текст интерфейса, а текст
 * интерфейса переводится.
 *
 * Отсюда единственное, что здесь важно проверять: словари и список ключей не
 * имеют права разойтись. Новый пресет в `shared-kernel` без строки в словаре
 * даёт мастеру пустое место в галерее оформлений — и до этого теста узнать об
 * этом можно было только глазами.
 */

describe('themeDescription — каждая палитра описана', () => {
  it.each(THEME_PRESET_KEYS)('«%s» описана по-русски', (key) => {
    expect(themeDescription(key, ru)).toBeTruthy();
  });

  it('описание переводится, а не остаётся русским во всех языках', () => {
    const key = THEME_PRESET_KEYS[0]!;

    expect(themeDescription(key, buildMessages('en'))).not.toBe(themeDescription(key, ru));
  });

  it.each(THEME_PRESET_KEYS)('«%s» описана и в английском, и в латышском', (key) => {
    // Частичный перевод падает на русский ключ за ключом, поэтому проверяется
    // сам словарь, а не собранное сообщение: иначе дыра в переводе прошла бы
    // молча.
    expect(en.presets?.[keyOfTheme(key)]).toBeTruthy();
    expect(lv.presets?.[keyOfTheme(key)]).toBeTruthy();
  });
});

describe('fontDescription — каждая пара шрифтов описана', () => {
  it.each(FONT_PRESET_KEYS)('«%s» описана по-русски', (key) => {
    expect(fontDescription(key, ru)).toBeTruthy();
  });

  it.each(FONT_PRESET_KEYS)('«%s» описана и в английском, и в латышском', (key) => {
    const dictKey = keyOfFont(key);

    expect(en.presets?.[dictKey]).toBeTruthy();
    expect(lv.presets?.[dictKey]).toBeTruthy();
  });

  it('описание не повторяет ключ — это фраза человеку, а не машине', () => {
    for (const key of FONT_PRESET_KEYS) {
      expect(fontDescription(key, ru)).not.toBe(key);
    }
  });
});

describe('designCopy — у мира есть имя и объяснение', () => {
  it.each(DESIGN_PRESET_KEYS)('«%s» несёт и название, и описание', (key) => {
    const copy = designCopy(key, ru);

    expect(copy.name).toBeTruthy();
    expect(copy.description).toBeTruthy();
    // Название — не то же самое, что описание: иначе карточка мира повторяет
    // себя дважды.
    expect(copy.name).not.toBe(copy.description);
  });

  it('названия миров не повторяются', () => {
    const names = DESIGN_PRESET_KEYS.map((key) => designCopy(key, ru).name);

    expect(new Set(names).size).toBe(names.length);
  });

  it('описание мира переводится, а имя может остаться собственным', () => {
    /* «Luxury», «Aura», «Funk» — имена собственные, и переводить их было бы
       ошибкой в любом языке. Переводится то, что объясняет мир. */
    const key = DESIGN_PRESET_KEYS[0]!;

    expect(designCopy(key, buildMessages('lv')).description).not.toBe(
      designCopy(key, ru).description,
    );
  });

  it.each(DESIGN_PRESET_KEYS)('«%s» описан во всех трёх языках', (key) => {
    for (const locale of ['ru', 'en', 'lv'] as const) {
      const copy = designCopy(key, buildMessages(locale));
      expect(copy.name).toBeTruthy();
      expect(copy.description).toBeTruthy();
    }
  });
});

/**
 * Ключ словаря, соответствующий палитре, — тот же, которым пользуется
 * `themeDescription`. Выводится из русского словаря, чтобы тест не повторял
 * таблицу соответствий, которую он проверяет.
 */
function keyOfTheme(theme: string): keyof typeof ru.presets {
  return dictKeyFor(themeDescription(theme as never, ru));
}

/** То же для пары шрифтов. */
function keyOfFont(font: string): keyof typeof ru.presets {
  return dictKeyFor(fontDescription(font as never, ru));
}

function dictKeyFor(value: string): keyof typeof ru.presets {
  const entry = Object.entries(ru.presets).find(([, text]) => text === value);
  return entry![0] as keyof typeof ru.presets;
}
