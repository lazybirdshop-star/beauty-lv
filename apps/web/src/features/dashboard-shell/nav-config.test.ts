import { describe, expect, it } from 'vitest';

import { buildMessages } from '@/lib/i18n/resolve';
import { ru } from '@/lib/i18n/messages';

import { getMasterNavItems } from './nav-config';

/**
 * Навигация кабинета мастера.
 *
 * Порядок здесь значит дважды: сайдбар раскладывает пункты по группам, а
 * нижняя панель на телефоне берёт **первые четыре** себе вкладками, остальное
 * прячет в «Ещё». Поэтому четыре самых нужных экрана обязаны идти первыми — и
 * это проверяемое свойство, а не договорённость на словах.
 */

/** Столько пунктов забирает себе нижняя панель — см. `BottomTabBar`. */
const PRIMARY_COUNT = 4;

const SLUG = 'anna';

describe('getMasterNavItems — порядок решает', () => {
  it('первыми четырьмя идут ежедневные экраны работы', () => {
    const primary = getMasterNavItems(SLUG, ru)
      .slice(0, PRIMARY_COUNT)
      .map((item) => item.key);

    // Ровно то, что мастер открывает каждый день: день, окна, записи, люди.
    expect(primary).toEqual(['home', 'calendar', 'bookings', 'clients']);
  });

  it('все четыре вкладки — из рабочей группы', () => {
    const primary = getMasterNavItems(SLUG, ru).slice(0, PRIMARY_COUNT);

    expect(primary.every((item) => item.group === 'work')).toBe(true);
  });

  it('«Записи» попадают в нижнюю панель — там же, где живёт счётчик ждущих', () => {
    const keys = getMasterNavItems(SLUG, ru)
      .slice(0, PRIMARY_COUNT)
      .map((item) => item.key);

    // Счётчик неотвеченных записей висит на этом пункте; уехав в «Ещё», он
    // перестал бы попадаться мастеру на глаза — то есть перестал бы работать.
    expect(keys).toContain('bookings');
  });
});

describe('getMasterNavItems — адреса', () => {
  it('все ссылки ведут в кабинет этого мастера', () => {
    for (const item of getMasterNavItems(SLUG, ru)) {
      expect(item.href.startsWith(`/${SLUG}/dashboard`)).toBe(true);
    }
  });

  it('главная — корень кабинета, без хвоста', () => {
    const home = getMasterNavItems(SLUG, ru).find((item) => item.key === 'home');

    expect(home!.href).toBe(`/${SLUG}/dashboard`);
  });

  it('ключи не повторяются — иначе React перепутает пункты между собой', () => {
    const keys = getMasterNavItems(SLUG, ru).map((item) => item.key);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('адрес меняется вместе с мастером', () => {
    expect(getMasterNavItems('boris', ru)[0]!.href).toBe('/boris/dashboard');
  });
});

describe('getMasterNavItems — слова', () => {
  it('говорит на языке мастера', () => {
    const en = buildMessages('en');
    const bookings = (t: Parameters<typeof getMasterNavItems>[1]) =>
      getMasterNavItems(SLUG, t)!.find((item) => item.key === 'bookings')!;

    expect(bookings(ru).label).toBe(ru.nav.bookings);
    expect(bookings(en).label).toBe(en.nav.bookings);
  });

  it('подсказка каждого пункта тоже переведена, а не только его название', () => {
    // Русская строка «про запас» в латышском кабинете — не менее заметная
    // ошибка, чем непереведённое название раздела, и куда более тихая.
    const en = buildMessages('en');
    for (const item of getMasterNavItems(SLUG, en)) {
      expect(item.hint === undefined || /[А-Яа-я]/.test(item.hint)).toBe(false);
    }
  });

  it('каждый пункт объясняет, что за ним — мастер пришла со своим ремеслом', () => {
    // Из слов «Календарь» и «Записи» никак не понять, где её свободные окна, а
    // где чужие просьбы: подсказка — часть навигации, а не украшение.
    for (const item of getMasterNavItems(SLUG, ru)) {
      expect(item.hint?.length ?? 0).toBeGreaterThan(0);
    }
  });

  /*
   * Здесь стояла проверка «все разделы рабочие»: `every(item => item.ready)`
   * над флагом, который во всех пунктах обоих меню был выставлен в `true` и
   * не читался ни одним компонентом. Такой тест не мог упасть — он повторял
   * константу, а не проверял продукт, и заодно поддерживал в типе поле,
   * обещавшее несуществующий режим «раздел есть, но за ним заглушка».
   *
   * Заглушек в кабинете больше нет — вместе с флагом убран и последний
   * `ComingSoonScreen` с экрана настроек. Тому, что раздел действительно
   * открывается, свидетель — маршрут в `app/[slug]/dashboard`, а не поле в
   * конфиге меню.
   */
});
