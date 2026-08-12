#!/usr/bin/env node
/**
 * Проверка контраста лендинга поверх градиентных полей.
 *
 *   pnpm --filter @amolie/web landing:contrast
 *
 * Градиентное поле (`marketing-mesh.css`) — единственное на лендинге, что
 * меняет светлоту под текстом, причём непрерывно и по-разному на каждом
 * вьюпорте. Глазом такое не принимается: «вроде читается» на макбуке — это
 * 3.8:1 на телефоне. Скрипт снимает настоящую страницу из production-сборки,
 * прячет саму краску текста и меряет **худший** пиксель фона в его рамке.
 *
 * Порог берётся по WCAG 2.2 §1.4.3 от кегля и насыщенности: 3:1 для крупного
 * (≥24px, или ≥18.66px полужирного), 4.5:1 для остального. Проверяется на
 * обоих вьюпортах, с элементом, доведённым до центра экрана, — то есть ровно
 * там, где его читают, и с тем сносом поля, который к этому моменту накопил
 * скролл-таймлайн.
 *
 * Сборка используется готовая (`.next`), как и в визуальных базлайнах; если
 * её нет — запускается автоматически.
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import pngjs from 'pngjs';
import { chromium } from 'playwright';

const { PNG } = pngjs;

const WEB_PORT = 4126;
const WEB_HOST = '127.0.0.1';
const WEB_ORIGIN = `http://${WEB_HOST}:${WEB_PORT}`;

const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1440, height: 900 },
};

/**
 * Что меряем. Не «весь текст страницы»: под полями лежит ровно первый экран
 * и тёмная полоса, остальное стоит на ровной земле мира и меряется один раз
 * в спеке, а не на каждом прогоне.
 */
const TARGETS = [
  { name: 'надстрочник героя', selector: '.amolie-landing main p:first-of-type' },
  { name: 'заявление, строка 1', selector: '.amolie-landing h1 .lp-enter-line' },
  {
    name: 'заявление, строка 2 (вино)',
    selector: '.amolie-landing h1 .lp-enter-clip:last-child .lp-enter-line',
  },
  { name: 'абзац героя', selector: '.amolie-landing .lp-measure' },
  { name: 'ссылка «как это работает»', selector: '.amolie-landing main a[href="#steps"]' },
  { name: 'знак в шапке', selector: '.amolie-landing header a[aria-label="AMOLIE"]' },
  { name: 'вход в шапке', selector: '.amolie-landing header a[href="/login"]' },
  { name: 'заголовок обещания', selector: '.lp-mesh--ember ~ div h3' },
  { name: 'текст обещания', selector: '.lp-mesh--ember ~ div h3 + p' },
];

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, '..');

function resolveNextBin() {
  const require = createRequire(path.join(webRoot, 'package.json'));
  return require.resolve('next/dist/bin/next');
}

function ensureProductionBuild() {
  if (fs.existsSync(path.join(webRoot, '.next', 'BUILD_ID'))) {
    console.log('Используется существующая сборка .next (после правок кода пересоберите).');
    return;
  }
  console.log('Сборки .next нет — запускаю production build…');
  const result = spawnSync(process.execPath, [resolveNextBin(), 'build'], {
    cwd: webRoot,
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function startNextServer() {
  const child = spawn(
    process.execPath,
    [resolveNextBin(), 'start', '-p', String(WEB_PORT), '-H', WEB_HOST],
    { cwd: webRoot, env: { ...process.env }, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  child.stderr.on('data', (chunk) => process.stderr.write(`[next] ${chunk}`));
  return child;
}

async function waitForServer(url, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // Сервер ещё поднимается.
    }
    if (Date.now() > deadline) throw new Error(`next start не ответил: ${url}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

/** Относительная яркость по WCAG 2.2, канал 0–255. */
function luminance(r, g, b) {
  const channel = (value) => {
    const s = value / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(a, b) {
  const [light, dark] = a > b ? [a, b] : [b, a];
  return (light + 0.05) / (dark + 0.05);
}

function parseCssColor(value) {
  const match = value.match(/-?[\d.]+/g);
  if (!match || match.length < 3) throw new Error(`Не разобран цвет: ${value}`);
  return { r: Number(match[0]), g: Number(match[1]), b: Number(match[2]) };
}

/** Порог WCAG для кегля: крупный текст читается и при 3:1. */
function thresholdFor({ fontSizePx, fontWeight }) {
  const bold = Number(fontWeight) >= 700;
  const large = fontSizePx >= 24 || (bold && fontSizePx >= 18.66);
  return large ? 3 : 4.5;
}

/** Краска и кегль до того, как краска будет погашена. */
async function readInk(page, target) {
  const locator = page.locator(target.selector).first();
  if ((await locator.count()) === 0) throw new Error(`Не найден элемент: ${target.selector}`);
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      color: style.color,
      fontSizePx: parseFloat(style.fontSize),
      fontWeight: style.fontWeight,
    };
  });
}

/**
 * Гасится краска **всей** страницы, а не одного элемента: рамка строки
 * заходит на выносные элементы соседней (у клипа отрицательный отступ), и
 * чужая буква внутри рамки мерилась бы как фон. Геометрия при этом не
 * трогается ни на пиксель — прозрачная краска занимает то же место.
 */
const HIDE_INK_CSS = `
  .amolie-landing, .amolie-landing * {
    color: transparent !important;
    -webkit-text-fill-color: transparent !important;
    text-decoration-color: transparent !important;
  }
`;

async function measure(page, target, viewportName, info) {
  const locator = page.locator(target.selector).first();

  await locator.scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    // Скролл-таймлайны считаются на следующем кадре после прокрутки.
    return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });

  // Снимок именно элемента, а не окна с вырезом: у `page.screenshot({clip})`
  // координаты документа, а рамка элемента — экранные, и на прокрученной
  // странице вырез уехал бы в чужое место.
  const shot = await locator.screenshot();

  // Отладка глазами: LANDING_CONTRAST_DUMP=<каталог> сохраняет то, что
  // именно мерилось. Число без картинки не спорит с версией «замер врёт».
  if (process.env.LANDING_CONTRAST_DUMP) {
    const dir = process.env.LANDING_CONTRAST_DUMP;
    fs.mkdirSync(dir, { recursive: true });
    const slug = target.name.replace(/[^\p{L}\d]+/gu, '-');
    fs.writeFileSync(path.join(dir, `${viewportName}-${slug}.png`), shot);
  }

  const png = PNG.sync.read(shot);
  const ink = parseCssColor(info.color);
  const inkLuminance = luminance(ink.r, ink.g, ink.b);

  let worst = Infinity;
  for (let i = 0; i < png.data.length; i += 4) {
    const ratio = contrastRatio(
      inkLuminance,
      luminance(png.data[i], png.data[i + 1], png.data[i + 2]),
    );
    if (ratio < worst) worst = ratio;
  }

  return { worst, threshold: thresholdFor(info), fontSizePx: info.fontSizePx };
}

async function main() {
  // LANDING_CONTRAST_ORIGIN=<адрес> меряет уже поднятый сервер. Нужен, когда
  // страницу правят подряд: своя сборка на каждый замер — это минуты ожидания
  // там, где нужны секунды.
  const external = process.env.LANDING_CONTRAST_ORIGIN;
  const origin = external ?? WEB_ORIGIN;
  if (!external) ensureProductionBuild();
  const server = external ? null : startNextServer();
  let failures = 0;

  try {
    await waitForServer(origin);
    const browser = await chromium.launch();

    for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
      const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
      const page = await context.newPage();
      await page.goto(origin, { waitUntil: 'networkidle' });
      // Переходы выключены на время замера: без этого снимок застаёт краску
      // на середине 150-миллисекундного перехода к прозрачности и мерил бы
      // сам текст, а не фон под ним. Анимации не трогаем: снос поля обязан
      // остаться там, куда его привёл скролл.
      await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; }' });
      await page.evaluate(() => document.fonts.ready);

      const inks = [];
      for (const target of TARGETS) inks.push(await readInk(page, target));
      await page.addStyleTag({ content: HIDE_INK_CSS });

      console.log(`\n${viewportName} ${viewport.width}×${viewport.height}`);
      for (const [index, target] of TARGETS.entries()) {
        const { worst, threshold, fontSizePx } = await measure(
          page,
          target,
          viewportName,
          inks[index],
        );
        const ok = worst >= threshold;
        if (!ok) failures += 1;
        console.log(
          `  ${ok ? '✓' : '✗'} ${target.name}: ${worst.toFixed(2)}:1 ` +
            `(нужно ${threshold}:1 при ${fontSizePx.toFixed(0)}px)`,
        );
      }

      await context.close();
    }

    await browser.close();
  } finally {
    server?.kill('SIGTERM');
  }

  if (failures > 0) {
    console.error(`\nПоле отнимает контраст у текста: провалов — ${failures}.`);
    process.exit(1);
  }
  console.log('\nВсе замеры выше порога.');
}

await main();
