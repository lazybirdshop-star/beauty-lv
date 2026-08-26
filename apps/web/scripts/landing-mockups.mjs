#!/usr/bin/env node
/**
 * Снимки продукта для лендинга.
 *
 *   pnpm --filter @amolie/web landing:mockups -- --password=…
 *
 * Что снимается и куда ложится:
 *
 *   public/landing/screen-booking.jpg    страница записи — текстура на стекле
 *                                        устройства в герое (mockup-stage)
 *   public/landing/screen-cabinet.jpg    главная кабинета — второй экран того
 *                                        же устройства, за поворотом
 *   public/landing/theme-{clean,neon,editorial}.jpg
 *                                        та же страница в трёх мирах — веер
 *                                        из трёх телефонов в блоке обликов
 *
 * Зачем скрипт, а если раньше снимали руками.
 *
 * Снимали, и это видно: на прежних кадрах у мастера одна услуга, ноль записей
 * впереди, «свободных окон: 46» и ближайшее свободное окно в 00:00. Лендинг
 * рядом обещает утро, в котором день уже занят, а показывает пустой календарь
 * с записью на полночь — то есть ровно то, от чего продукт избавляет. Три
 * снимка облика вдобавок сняты в разное время и с разных кабинетов: 46 окон,
 * 43 окна, 1 услуга — одна страница, которая на трёх телефонах ведёт себя как
 * три разных.
 *
 * Здесь все пять кадров снимаются подряд с одного показательного кабинета
 * (`db:demo` — шесть услуг, семеро клиентов, расписание, занятое почти
 * целиком), в одном
 * размере и с одной плотностью. Пересняться они обязаны вместе, иначе
 * расхождение вернётся.
 *
 * Миры переодеваются `db:demo-look`, а не параметром в адресе: холст Студии
 * принимает облик сообщением, и правильно делает — страница, оформление
 * которой задаётся из адреса, была бы страницей, оформление которой задаёт
 * кто угодно.
 *
 * Сервер должен быть уже запущен (dev годится: страница берёт данные из БД на
 * каждый запрос). Пароль показательного мастера печатает `db:demo`.
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(scriptDir, '..', 'public', 'landing');
const REPO_ROOT = path.resolve(scriptDir, '..', '..', '..');

const arg = (name, fallback) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;

const origin = arg('origin', 'http://127.0.0.1:3000');
const slug = arg('slug', 'neve-ashgrove');
const email = arg('email', 'neve@amolie.test');
const password = arg('password');

if (!password) {
  console.error(
    'Нужен пароль показательного мастера — его печатает `pnpm --filter @amolie/api db:demo`.\n' +
      '  pnpm --filter @amolie/web landing:mockups -- --password=…',
  );
  process.exit(1);
}

/*
 * Размер кадра.
 *
 * Ширина 450 — та же, в которой снят прежний кадр страницы записи (900px при
 * плотности 2), и на ней страница мастера уже даёт телефонную раскладку.
 * Высота 1032 повторяет соотношение стекла iPhone 16 Pro: сцена кладёт кадр
 * шире стекла во всю ширину и прижимает к верху (phone-scene.ts), поэтому
 * лишнего низа лучше не иметь вовсе — он уедет под кромку.
 */
const PHONE = { width: 450, height: 1032 };
const SCALE = 2;

/** Кабинет снимается в своей телефонной раскладке — с нижней панелью вкладок. */
const CABINET = { width: 390, height: 860 };

/** Качество JPEG. 88 — снимок интерфейса: мелкий текст, видны артефакты. */
const QUALITY = 88;

const LOOKS = [
  { file: 'theme-clean.jpg', preset: 'soft' },
  { file: 'theme-neon.jpg', preset: 'funk' },
  { file: 'theme-editorial.jpg', preset: 'poster' },
];

/** Мир, в котором показательный кабинет живёт между съёмками (`demo.ts`). */
const HOME_PRESET = 'aura';

function wearLook(preset) {
  execFileSync('pnpm', ['--filter', '@amolie/api', 'db:demo-look', preset], {
    cwd: REPO_ROOT,
    stdio: 'pipe',
  });
}

/**
 * Дать странице догрузиться и замереть.
 *
 * `networkidle` не хватает: у миров есть приходы по появлению в кадре и
 * собственные шрифты, и снимок, сделанный сразу после загрузки, ловит
 * половину страницы в блюре — ровно то, чем испорчен не один кадр в этой
 * папке.
 */
async function settle(page) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
}

const browser = await chromium.launch();

try {
  /* ─────────────────────────────── страница записи и три её облика ───── */
  const phone = await browser.newContext({
    viewport: PHONE,
    deviceScaleFactor: SCALE,
    /* Мир показательного кабинета английский (`demo.ts`), и лендинг, на
       котором эти кадры лежат, встречает посетителя тоже по-английски. */
    locale: 'en-GB',
    /* Приходы по скроллу отдают конечное состояние сразу: снимается то, что
       читатель видит в итоге, а не первый кадр анимации. */
    reducedMotion: 'reduce',
  });
  const page = await phone.newPage();

  for (const { file, preset } of [{ file: 'screen-booking.jpg', preset: HOME_PRESET }, ...LOOKS]) {
    wearLook(preset);
    await page.goto(`${origin}/${slug}`, { waitUntil: 'domcontentloaded' });
    await settle(page);
    await page.screenshot({
      path: path.join(OUT_DIR, file),
      type: 'jpeg',
      quality: QUALITY,
    });
    console.log(`${file}  ←  ${preset}`);
  }

  await phone.close();

  /* ─────────────────────────────────────────────── главная кабинета ───── */
  const cabinet = await browser.newContext({
    viewport: CABINET,
    deviceScaleFactor: SCALE,
    locale: 'en-GB',
    reducedMotion: 'reduce',
    /*
     * Кабинет снимается тёмным намеренно, и это не вкусовщина.
     *
     * Устройство в герое поворачивается и меняет светлую страницу клиента на
     * кабинет мастера. Если кабинет тоже светлый, поворот показывает второй
     * такой же экран и жест теряет смысл — а весь блок построен на том, что
     * это две разные стороны одной минуты. Тема берётся системная
     * (`next-themes`, `defaultTheme="system"`), поэтому достаточно попросить
     * тёмную у самого браузера.
     */
    colorScheme: 'dark',
  });
  /*
   * Вход настоящим маршрутом входа, а не подделкой куки: токен подписан API,
   * и собирать его здесь значило бы держать в скрипте копию секрета.
   *
   * Запросом, а не формой: форма уводит на кабинет мягкой навигацией, у
   * которой нет события `load`, и ожидание адреса упиралось в таймаут при
   * успешном входе. Кувшин кук у `context.request` общий со страницами
   * контекста, поэтому `access_token` из ответа оказывается там же, где он
   * оказался бы после нажатия кнопки.
   */
  const signIn = await cabinet.request.post(`${origin}/api/auth/login`, {
    data: { email, password },
  });
  if (!signIn.ok()) {
    throw new Error(
      `Вход не удался (${signIn.status()}). Пароль печатает \`db:demo\` — он меняется на каждом прогоне.`,
    );
  }

  const dash = await cabinet.newPage();
  await dash.goto(`${origin}/${slug}/dashboard`, { waitUntil: 'domcontentloaded' });
  if (/\/login/.test(dash.url())) {
    throw new Error('Кабинет отдал вход обратно — сессия не встала.');
  }
  await settle(dash);
  await dash.screenshot({
    path: path.join(OUT_DIR, 'screen-cabinet.jpg'),
    type: 'jpeg',
    quality: QUALITY,
  });
  console.log('screen-cabinet.jpg');

  await cabinet.close();
} finally {
  /* Кабинет обязан остаться в своём мире, чем бы ни кончился прогон: иначе
     следующий, кто откроет `/neve-ashgrove`, увидит его в чужом оформлении. */
  try {
    wearLook(HOME_PRESET);
  } catch {
    console.error(`Не удалось вернуть облик «${HOME_PRESET}» — сделайте это вручную:`);
    console.error(`  pnpm --filter @amolie/api db:demo-look ${HOME_PRESET}`);
  }
  await browser.close();
}

console.log('\nПостер устройства снимается отдельно и после — он берёт кадр со стекла:');
console.log('  pnpm --filter @amolie/web landing:poster -- --origin=' + origin);
