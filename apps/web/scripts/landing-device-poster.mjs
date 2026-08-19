#!/usr/bin/env node
/**
 * Постер устройства для первого экрана лендинга.
 *
 * В герое телефон по замыслу стоит неподвижно (mockup-stage.tsx), поэтому там
 * достаточно картинки, а WebGL нужен только с началом прокрутки — к повороту.
 * Чтобы подмена была незаметна, постер снимается не «похожим», а тем самым
 * кадром: страница открывается в прод-сборке, сцена доводится до позы героя
 * (прогресс 0), и снимается её холст.
 *
 *   node scripts/landing-device-poster.mjs [--origin=http://127.0.0.1:3000]
 *
 * Сервер должен быть уже запущен. Результат — public/landing/device-hero.png
 * с прозрачным фоном; в AVIF/WebP его переводит оптимизатор на лету.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';
import pngjs from 'pngjs';

const { PNG } = pngjs;

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(scriptDir, '..', 'public', 'landing', 'device-hero.png');

const origin =
  process.argv.find((a) => a.startsWith('--origin='))?.slice('--origin='.length) ??
  'http://127.0.0.1:3000';

/* Кадр снимается в самой крупной раскладке, какую страница даёт риг:
   --stage-h упирается в 800px, --stage-w = 0.62 от неё. Плотность 2 —
   столько же, сколько запрашивает у себя сама сцена (MAX_DPR). */
const VIEWPORT = { width: 1440, height: 1000 };
const SCALE = 2;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: SCALE });
const page = await ctx.newPage();

/* ?nosnap — чтобы прилипание не утащило страницу с нулевого прогресса. */
await page.goto(`${origin}/?nosnap`, { waitUntil: 'networkidle' });

/* Сцена ждёт первого движения читателя (mockup-stage.tsx) — здесь её надо
   позвать самим. Событие синтетическое и страницу не двигает: прогресс
   обязан остаться нулевым, иначе снимется не поза героя. */
await page.evaluate(() => window.dispatchEvent(new Event('wheel')));
await page.waitForSelector('.stage__canvas.is-loaded', { timeout: 60_000 });
/* Сцена рисует по требованию: дать ей доехать до позы и погасить дрожь. */
await page.waitForTimeout(2500);

const box = await page.evaluate(() => {
  /* Риг в герое сдвинут и поджат средствами CSS, а постер ляжет внутрь того
     же рига и получит те же преобразования — снимать надо холст как есть. */
  const style = document.createElement('style');
  style.textContent = `
    .amolie-site .stage__rig { transform: none !important; translate: none !important; }
    .amolie-site .stage__canvas { opacity: 1 !important; }
    .amolie-site .stage__poster { display: none !important; }
    html, body, .amolie-site { background: transparent !important; }
    .amolie-site > *:not(.stage-track), .stage-track > *:not(.stage),
    .stage__glow, .hero, .showcase { visibility: hidden !important; }
  `;
  document.head.appendChild(style);
  const canvas = document.querySelector('.stage__canvas');
  const r = canvas.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
});

const shot = await page.screenshot({ clip: box, omitBackground: true });
await browser.close();

/*
 * Прозрачное поле вокруг устройства — под цвет, а не как снялось.
 *
 * Снимок с `omitBackground` оставляет в полностью прозрачных пикселях тот
 * цвет, который там оказался: свечение сцены, зерно, разводы. Глазу этого не
 * видно — альфа нулевая, — а кодировщику видно, и он честно тратит на эту
 * невидимую крупу битрейт. Постер в AVIF весил из-за неё 225 КБ вместо
 * тридцати с небольшим. Здесь прозрачное поле выравнивается в один цвет,
 * и кодировщик сжимает его в ничто.
 */
/* Порог, а не строгий ноль: поле вокруг устройства снимается не с нулевой
   альфой, а с двойкой-семёркой из 255 — меньше трёх процентов. На чернильной
   земле такого не видно ни при какой яркости, зато кодировщику эта крупа
   стоила семикратного веса файла. Кромка самого устройства уходит в
   непрозрачность за пару пикселей, так что срезать ей нечего. */
const CLEAR_BELOW = 8;

const png = PNG.sync.read(shot);
let cleared = 0;
for (let i = 0; i < png.data.length; i += 4) {
  if (png.data[i + 3] >= CLEAR_BELOW) continue;
  png.data[i] = 0;
  png.data[i + 1] = 0;
  png.data[i + 2] = 0;
  png.data[i + 3] = 0;
  cleared++;
}
/* Мастер-файл в репозитории, наружу он не уходит — его пережимает
   оптимизатор. Поэтому жмём как можно плотнее, время здесь не дорого. */
fs.writeFileSync(OUT, PNG.sync.write(png, { deflateLevel: 9 }));

const kb = (fs.statSync(OUT).size / 1024).toFixed(1);
const share = ((cleared / (png.width * png.height)) * 100).toFixed(0);
console.log(
  `postered ${path.relative(process.cwd(), OUT)} — ${png.width}x${png.height}, ${kb} KB ` +
    `(${share}% кадра — прозрачное поле, выровнено)`,
);
