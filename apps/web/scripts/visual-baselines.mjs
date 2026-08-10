#!/usr/bin/env node
/**
 * Скриншот-харнесс визуальных базлайнов (BRAND_STYLE_ARCHITECTURE.md §16, шаг M0).
 *
 *   pnpm --filter @amolie/web visual:baseline   — записать/обновить базлайны
 *   pnpm --filter @amolie/web visual:check      — сравнить текущий рендер с базлайнами
 *
 * Фильтры прогона: `--preset=soft,poster`, `--viewport=mobile|desktop`,
 * `--state=profile,prices,contacts,booking-sheet`, `--variant=color|grayscale`.
 *
 * Снимается: 8 designPresetKey × 4 состояния (страница мастера, прайс,
 * контакты, открытая шторка записи) × 2 вьюпорта (390×844 mobile-first,
 * 1440×900 desktop) × 2 варианта (цвет + grayscale без изображений —
 * монохром-тест §15) = 128 кадров.
 *
 * Детерминизм (§16.2): фикстурный API-сервер вместо БД (tests/visual/server.mjs),
 * замороженное время на сервере (scripts/freeze-time.cjs через NODE_OPTIONS) и
 * в браузере (page.clock), фиксированная таймзона Europe/Riga, эмуляция
 * prefers-reduced-motion (анимации схлопываются по закону А5), ожидание
 * document.fonts.ready и networkidle перед каждым кадром.
 *
 * Сравнение (§16.3): pixelmatch с учётом антиалиасинга; провал — доля
 * diff-пикселей > 0.1% площади кадра или изменение размеров кадра.
 * Актуальные кадры — tests/visual/current/, diff-кадры — tests/visual/diffs/
 * (оба каталога в git не коммитятся; базлайны коммитятся).
 *
 * Харнесс работает с production-сборкой (`next start`), а не с dev-сервером:
 * так кадры соответствуют тому, что видят клиенты. Если .next нет, сборка
 * запускается автоматически; если есть — используется как есть (после правок
 * кода пересоберите: pnpm --filter @amolie/web build).
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import pixelmatch from 'pixelmatch';
import { chromium } from 'playwright';
import pngjs from 'pngjs';

import {
  DESIGN_PRESET_KEYS,
  FIXED_NOW,
  fixtureSlug,
  TIMEZONE,
} from '../tests/visual/fixtures.mjs';
import { startFixtureServer } from '../tests/visual/server.mjs';

const { PNG } = pngjs;

const API_PORT = 4123;
const WEB_PORT = 4124;
const WEB_HOST = '127.0.0.1';
const WEB_ORIGIN = `http://${WEB_HOST}:${WEB_PORT}`;

const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1440, height: 900 },
};

const STATES = ['profile', 'prices', 'contacts', 'booking-sheet'];
const VARIANTS = ['color', 'grayscale'];

const DIFF_RATIO_THRESHOLD = 0.001;

const MONOCHROME_CSS = `
  html { filter: grayscale(1) !important; }
  img, picture, video { visibility: hidden !important; }
`;

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, '..');
const baselinesRoot = path.join(webRoot, 'tests', 'visual', 'baselines');
const currentRoot = path.join(webRoot, 'tests', 'visual', 'current');
const diffsRoot = path.join(webRoot, 'tests', 'visual', 'diffs');

function parseArgs(argv) {
  const mode = argv[0];
  if (mode !== 'baseline' && mode !== 'check') {
    console.error(
      'Использование: node scripts/visual-baselines.mjs <baseline|check> ' +
        '[--preset=a,b] [--viewport=mobile|desktop] [--state=profile,…] [--variant=color|grayscale]',
    );
    process.exit(2);
  }
  const list = (name, allowed) => {
    const prefix = `--${name}=`;
    const hit = argv.find((arg) => arg.startsWith(prefix));
    const values = hit ? hit.slice(prefix.length).split(',') : [...allowed];
    for (const value of values) {
      if (!allowed.includes(value)) {
        console.error(`Неизвестное значение --${name}: ${value}. Доступны: ${allowed.join(', ')}`);
        process.exit(2);
      }
    }
    return values;
  };
  return {
    mode,
    presets: list('preset', DESIGN_PRESET_KEYS),
    viewports: list('viewport', Object.keys(VIEWPORTS)),
    states: list('state', STATES),
    variants: list('variant', VARIANTS),
  };
}

function resolveNextBin() {
  const require = createRequire(path.join(webRoot, 'package.json'));
  return require.resolve('next/dist/bin/next');
}

function ensureProductionBuild() {
  if (fs.existsSync(path.join(webRoot, '.next', 'BUILD_ID'))) {
    console.log(
      'Используется существующая сборка .next (после правок кода пересоберите: ' +
        'pnpm --filter @amolie/web build).',
    );
    return;
  }
  console.log('Сборки .next нет — запускаю production build…');
  const result = spawnSync(process.execPath, [resolveNextBin(), 'build'], {
    cwd: webRoot,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    console.error('next build упал — прогон отменён.');
    process.exit(result.status ?? 1);
  }
}

function startNextServer() {
  const freezeHook = path.join(webRoot, 'scripts', 'freeze-time.cjs');
  const nodeOptions = [process.env.NODE_OPTIONS, '--require', freezeHook]
    .filter(Boolean)
    .join(' ');
  const child = spawn(
    process.execPath,
    [resolveNextBin(), 'start', '-p', String(WEB_PORT), '-H', WEB_HOST],
    {
      cwd: webRoot,
      env: {
        ...process.env,
        API_URL: `http://${WEB_HOST}:${API_PORT}`,
        TZ: TIMEZONE,
        VISUAL_FIXED_NOW: FIXED_NOW,
        NODE_OPTIONS: nodeOptions,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  child.stderr.on('data', (chunk) => process.stderr.write(`[next] ${chunk}`));
  return child;
}

async function waitForServer(url, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Сервер ещё не поднялся — ждём следующей попытки.
    }
    if (Date.now() > deadline) {
      throw new Error(`next start не ответил за ${timeoutMs / 1000} с: ${url}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

/** Кадр стабилен: сеть затихла, шрифты применены, reduced-motion свернул анимации. */
async function settle(page) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
}

/**
 * Открытие шторки записи текущим поведением приложения, без тестовых крючков:
 * у Poster и Luxury ближайшее окно — первичный жест (одно нажатие несёт окно
 * в шторку), у остальных миров — путь «день → время → кнопка записи». В обоих
 * случаях шторка открывается на шаге услуг с carried-окном 10 февраля 10:00.
 */
async function openBookingSheet(page, preset) {
  if (preset === 'poster') {
    await page.getByRole('button', { name: /ближайшее свободное окно/i }).click();
  } else if (preset === 'luxury') {
    /* «Bergs»: полоса ближайшего окна несёт отдельную бронзовую кнопку —
       первая «Записаться» на странице (нижняя CTA без выбранного окна
       недоступна и в имени роли не участвует). */
    await page.getByRole('button', { name: /записаться/i }).first().click();
  } else {
    await page.getByRole('button', { name: /^10 — свободно окон/ }).click();
    await page.getByRole('button', { name: '10:00', exact: true }).click();
    await page.getByRole('button', { name: /записаться/i }).click();
  }
  await page.getByRole('dialog').waitFor({ state: 'visible' });
  await settle(page);
}

function stateUrl(preset, state) {
  const slug = fixtureSlug(preset);
  if (state === 'prices') return `${WEB_ORIGIN}/${slug}/prices`;
  if (state === 'contacts') return `${WEB_ORIGIN}/${slug}/contacts`;
  return `${WEB_ORIGIN}/${slug}`;
}

function shotName(state, viewport, variant) {
  return variant === 'grayscale'
    ? `${state}.${viewport}.grayscale.png`
    : `${state}.${viewport}.png`;
}

async function captureAll(browser, outRoot, filter) {
  for (const viewportName of filter.viewports) {
    const context = await browser.newContext({
      viewport: VIEWPORTS[viewportName],
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
      timezoneId: TIMEZONE,
      locale: 'ru-RU',
    });
    try {
      for (const preset of filter.presets) {
        for (const state of filter.states) {
          const page = await context.newPage();
          await page.clock.install();
          await page.clock.setFixedTime(FIXED_NOW);
          try {
            await page.goto(stateUrl(preset, state), { waitUntil: 'load' });
            await settle(page);
            if (state === 'booking-sheet') {
              await openBookingSheet(page, preset);
            }
            // Шторка — фиксированный оверлей: fullPage-склейка размножила бы её,
            // поэтому она снимается вьюпортом; страницы — целиком.
            const fullPage = state !== 'booking-sheet';
            const dir = path.join(outRoot, preset);
            fs.mkdirSync(dir, { recursive: true });
            if (filter.variants.includes('color')) {
              await page.screenshot({
                path: path.join(dir, shotName(state, viewportName, 'color')),
                fullPage,
                animations: 'disabled',
                caret: 'hide',
              });
            }
            if (filter.variants.includes('grayscale')) {
              await page.addStyleTag({ content: MONOCHROME_CSS });
              await page.waitForTimeout(100);
              await page.screenshot({
                path: path.join(dir, shotName(state, viewportName, 'grayscale')),
                fullPage,
                animations: 'disabled',
                caret: 'hide',
              });
            }
            console.log(`✓ ${preset}/${shotName(state, viewportName, 'color')}`);
          } finally {
            await page.close();
          }
        }
      }
    } finally {
      await context.close();
    }
  }
}

function compareAll(filter) {
  const failures = [];
  let compared = 0;
  for (const preset of filter.presets) {
    for (const state of filter.states) {
      for (const viewportName of filter.viewports) {
        for (const variant of filter.variants) {
          const name = shotName(state, viewportName, variant);
          const relative = `${preset}/${name}`;
          const baselinePath = path.join(baselinesRoot, relative);
          const currentPath = path.join(currentRoot, relative);
          if (!fs.existsSync(baselinePath)) {
            failures.push(`${relative}: нет базлайна (снимите: pnpm --filter @amolie/web visual:baseline)`);
            continue;
          }
          const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
          const current = PNG.sync.read(fs.readFileSync(currentPath));
          if (baseline.width !== current.width || baseline.height !== current.height) {
            failures.push(
              `${relative}: размер кадра изменился: было ${baseline.width}×${baseline.height}, ` +
                `стало ${current.width}×${current.height}`,
            );
            continue;
          }
          const diff = new PNG({ width: baseline.width, height: baseline.height });
          const diffPixels = pixelmatch(
            baseline.data,
            current.data,
            diff.data,
            baseline.width,
            baseline.height,
            { threshold: 0.1, includeAA: false, alpha: 0.1, diffColor: [255, 0, 255] },
          );
          compared += 1;
          const ratio = diffPixels / (baseline.width * baseline.height);
          if (ratio > DIFF_RATIO_THRESHOLD) {
            const diffDir = path.join(diffsRoot, preset);
            fs.mkdirSync(diffDir, { recursive: true });
            fs.writeFileSync(path.join(diffDir, name), PNG.sync.write(diff));
            failures.push(
              `${relative}: diff ${(ratio * 100).toFixed(3)}% площади ` +
                `(порог ${DIFF_RATIO_THRESHOLD * 100}%) — кадр tests/visual/diffs/${relative}`,
            );
          }
        }
      }
    }
  }
  return { compared, failures };
}

async function main() {
  const filter = parseArgs(process.argv.slice(2));
  ensureProductionBuild();

  const fixtureServer = await startFixtureServer(API_PORT);
  const nextServer = startNextServer();
  let exitCode = 0;
  try {
    await waitForServer(`${WEB_ORIGIN}/${fixtureSlug('soft-studio')}`);
    const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] });
    try {
      if (filter.mode === 'baseline') {
        await captureAll(browser, baselinesRoot, filter);
        console.log(
          `\nБазлайны записаны в tests/visual/baselines/: ${filter.presets.length} пресетов × ` +
            `${filter.states.length} состояний × ${filter.viewports.length} вьюпортов × ` +
            `${filter.variants.length} варианта.`,
        );
      } else {
        await captureAll(browser, currentRoot, filter);
        const { compared, failures } = compareAll(filter);
        if (failures.length > 0) {
          console.error(`\nvisual:check — провалов: ${failures.length}:`);
          for (const failure of failures) console.error(`  ✗ ${failure}`);
          exitCode = 1;
        } else {
          console.log(
            `\nvisual:check — ${compared} кадров совпали с базлайнами ` +
              `(порог ${DIFF_RATIO_THRESHOLD * 100}% площади кадра).`,
          );
        }
      }
    } finally {
      await browser.close();
    }
  } finally {
    nextServer.kill('SIGTERM');
    await new Promise((resolve) => fixtureServer.close(resolve));
  }
  process.exit(exitCode);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});