#!/usr/bin/env node
/**
 * Растровые копии фирменного знака.
 *
 *   pnpm --filter @amolie/web brand:raster
 *
 * Зачем вообще PNG, когда в `public/brand` лежит SVG. Уведомление рисует не
 * страница, а операционная система, и Chrome на Android отказывается от SVG в
 * `icon`/`badge` уведомления — вместо знака мастер увидит серый кружок.
 * Установка PWA на Android по той же причине предпочитает PNG 192 и 512, а
 * `favicon.ico` остаётся единственной иконкой, которую понимают старые
 * читалки лент и поисковые роботы, не умеющие SVG.
 *
 * Файлы порождённые, но коммитятся: они нужны в `public/` при сборке, а
 * гонять браузер на каждом деплое ради пяти картинок — плохая цена. Этот
 * скрипт существует, чтобы знак правился в одном месте — в исходном SVG, — а
 * не перерисовывался вручную во всех размерах.
 *
 * `badge` — отдельная история: в статус-баре Android рисует только альфу,
 * любой цвет всё равно станет белым силуэтом. Поэтому для него берётся
 * знак без плашки, залитый белым.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const webDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const brandDir = path.join(webDir, 'public', 'brand');

/** Знак на фирменном поле — иконка приложения и картинка уведомления. */
const APP_ICON = 'amolie-app-icon.svg';

/** Тот же знак крупнее в поле — источник растровых favicon. */
const FAVICON = 'amolie-favicon.svg';

/**
 * Тот же знак без плашки и белым по прозрачному — силуэт для статус-бара.
 * Пишется здесь, а не читается из файла: это единственное место в продукте,
 * где нужна именно эта форма, и отдельный SVG в `public/` только просился бы
 * быть использованным где-то ещё.
 */
const BADGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <g fill="#FFFFFF">
    <circle cx="256" cy="136" r="48" />
    <path d="M162 423V292a94 94 0 0 1 188 0v131h-52V292a42 42 0 0 0-84 0v131Z" />
  </g>
</svg>`;

const PNG_TARGETS = [
  { file: 'amolie-app-icon-192.png', size: 192, source: APP_ICON },
  { file: 'amolie-app-icon-512.png', size: 512, source: APP_ICON },
  { file: 'amolie-badge-96.png', size: 96, source: BADGE_SVG },
];

/**
 * Размеры внутри `favicon.ico`. 16 и 32 — вкладка и панель закладок, 48 —
 * ярлык на рабочем столе Windows. Каждый растрируется браузером из вектора
 * отдельно, а не уменьшением большого: на 16 px разница между этими двумя
 * путями — читаемая нога знака против серого пятна.
 */
const ICO_SIZES = [16, 32, 48];
const ICO_FILE = path.join(webDir, 'src', 'app', 'favicon.ico');

async function readSource(source) {
  return source.startsWith('<svg') ? source : fs.readFile(path.join(brandDir, source), 'utf8');
}

async function renderPng(browser, svg, size) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  });

  /* Прозрачный фон обязателен для badge и безвреден для иконки: у неё
     собственная непрозрачная плашка внутри SVG. */
  await page.setContent(
    `<!doctype html><style>
       html,body{margin:0;padding:0;background:transparent}
       svg{display:block;width:${size}px;height:${size}px}
     </style>${svg}`,
  );

  const png = await page.screenshot({ omitBackground: true });
  await page.close();

  return png;
}

/**
 * Контейнер ICO поверх готовых PNG.
 *
 * Формат допускает PNG внутри с Windows Vista, и все браузеры, ради которых
 * `.ico` вообще существует, это читают, — поэтому пережимать картинки в BMP
 * не нужно. Заголовок: 6 байт шапки, затем по 16 байт на размер, затем сами
 * PNG подряд. Ширина и высота пишутся одним байтом, где 0 означает 256.
 */
function packIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // тип: иконка
  header.writeUInt16LE(images.length, 4);

  const directory = Buffer.alloc(16 * images.length);
  let offset = header.length + directory.length;

  images.forEach(({ size, png }, index) => {
    const entry = 16 * index;
    directory.writeUInt8(size % 256, entry);
    directory.writeUInt8(size % 256, entry + 1);
    directory.writeUInt8(0, entry + 2); // палитра не используется
    directory.writeUInt8(0, entry + 3); // reserved
    directory.writeUInt16LE(1, entry + 4); // цветовых плоскостей
    directory.writeUInt16LE(32, entry + 6); // бит на пиксель
    directory.writeUInt32LE(png.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });

  return Buffer.concat([header, directory, ...images.map(({ png }) => png)]);
}

const browser = await chromium.launch();

try {
  for (const target of PNG_TARGETS) {
    const svg = await readSource(target.source);
    const png = await renderPng(browser, svg, target.size);
    await fs.writeFile(path.join(brandDir, target.file), png);

    console.log(`✓ ${target.file} (${target.size}×${target.size})`);
  }

  const faviconSvg = await readSource(FAVICON);
  const images = [];

  for (const size of ICO_SIZES) {
    images.push({ size, png: await renderPng(browser, faviconSvg, size) });
  }

  await fs.writeFile(ICO_FILE, packIco(images));

  console.log(`✓ favicon.ico (${ICO_SIZES.map((size) => `${size}×${size}`).join(', ')})`);
} finally {
  await browser.close();
}
