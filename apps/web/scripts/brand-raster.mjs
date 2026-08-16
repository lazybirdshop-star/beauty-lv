#!/usr/bin/env node
/**
 * Растровые копии фирменного знака.
 *
 *   pnpm --filter @amolie/web brand:raster
 *
 * Зачем вообще растр, когда в `public/brand` лежит SVG:
 *
 * — уведомление рисует не страница, а операционная система, и Chrome на
 *   Android отказывается от SVG в `icon`/`badge` — вместо знака мастер увидит
 *   серый кружок;
 * — установка PWA на Android по той же причине предпочитает PNG 192 и 512;
 * — iOS берёт иконку экрана «Домой» только из растрового `apple-icon`
 *   (Next.js для этого файла принимает `.png/.jpg`, но не `.svg`);
 * — `favicon.ico` остаётся единственной иконкой, которую понимают старые
 *   читалки лент и роботы, не умеющие SVG.
 *
 * Файлы порождённые, но коммитятся: они нужны при сборке, а гонять браузер на
 * каждом деплое ради шести картинок — плохая цена. Скрипт существует, чтобы
 * знак правился в одном месте — в исходных SVG, — а не перерисовывался
 * вручную во всех размерах.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const webDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const brandDir = path.join(webDir, 'public', 'brand');
const appDir = path.join(webDir, 'src', 'app');

/** Знак на фирменном поле — иконка приложения и картинка уведомления. */
const APP_ICON = 'amolie-app-icon.svg';

/** Тот же знак крупнее в поле — источник растровых favicon. */
const FAVICON = 'amolie-favicon.svg';

/**
 * Правки исходного знака под конкретного потребителя. Делаются в DOM уже
 * открытой страницы, а не копией разметки в этом файле: геометрия знака
 * обязана существовать в продукте ровно однажды — в SVG, — иначе однажды
 * поправят её там, а здесь останется прежняя фигура.
 *
 * `full-bleed` — знак без скруглённых углов. `maskable` и iOS означают, что
 * систему просят обрезать иконку под свою форму, и собственное скругление
 * оставило бы по углам прозрачность: Android подставит туда обои, iOS —
 * чёрное. Поле обязано доходить до края.
 *
 * `silhouette` — знак без плашки, залитый белым: в статус-баре Android рисует
 * только альфу, любой цвет всё равно станет белым силуэтом.
 */
const VARIANTS = {
  'as-authored': null,
  'full-bleed': () => {
    document.querySelector('svg rect')?.setAttribute('rx', '0');
  },
  silhouette: () => {
    document.querySelector('svg rect')?.remove();
    document.querySelector('svg g')?.setAttribute('fill', '#FFFFFF');
  },
};

const TARGETS = [
  { file: path.join(brandDir, 'amolie-app-icon-192.png'), size: 192, source: APP_ICON },
  { file: path.join(brandDir, 'amolie-app-icon-512.png'), size: 512, source: APP_ICON },
  {
    file: path.join(brandDir, 'amolie-app-icon-maskable-512.png'),
    size: 512,
    source: APP_ICON,
    variant: 'full-bleed',
  },
  { file: path.join(brandDir, 'amolie-badge-96.png'), size: 96, source: APP_ICON, variant: 'silhouette' },
  /* 180 — размер, который iOS просит у `apple-touch-icon` на телефонах с
     Retina; всё остальное система уменьшает сама. */
  { file: path.join(appDir, 'apple-icon.png'), size: 180, source: APP_ICON, variant: 'full-bleed' },
];

/**
 * Размеры внутри `favicon.ico`. 16 и 32 — вкладка и панель закладок, 48 —
 * ярлык на рабочем столе Windows. Каждый растрируется браузером из вектора
 * отдельно, а не уменьшением большого: на 16 px разница между этими двумя
 * путями — читаемая нога знака против серого пятна.
 */
const ICO_SIZES = [16, 32, 48];
const ICO_FILE = path.join(appDir, 'favicon.ico');

async function renderPng(browser, { source, size, variant = 'as-authored' }) {
  const svg = await fs.readFile(path.join(brandDir, source), 'utf8');
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  });

  /* Прозрачный фон обязателен для силуэта и безвреден для иконки: у неё
     собственная непрозрачная плашка внутри SVG. */
  await page.setContent(
    `<!doctype html><style>
       html,body{margin:0;padding:0;background:transparent}
       svg{display:block;width:${size}px;height:${size}px}
     </style>${svg}`,
  );

  const transform = VARIANTS[variant];
  if (transform) await page.evaluate(transform);

  const png = await page.screenshot({ omitBackground: true });
  await page.close();

  return png;
}

/**
 * Контейнер ICO поверх готовых PNG.
 *
 * Формат допускает PNG внутри начиная с Windows Vista, и все браузеры, ради
 * которых `.ico` вообще существует, это читают, — поэтому пережимать картинки
 * в BMP не нужно. Заголовок: 6 байт шапки, затем по 16 байт на размер, затем
 * сами PNG подряд. Ширина и высота пишутся одним байтом, где 0 значит 256.
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
  for (const target of TARGETS) {
    await fs.writeFile(target.file, await renderPng(browser, target));
    console.log(`✓ ${path.relative(webDir, target.file)} (${target.size}×${target.size})`);
  }

  const images = [];
  for (const size of ICO_SIZES) {
    images.push({ size, png: await renderPng(browser, { source: FAVICON, size }) });
  }

  await fs.writeFile(ICO_FILE, packIco(images));
  console.log(
    `✓ ${path.relative(webDir, ICO_FILE)} (${ICO_SIZES.map((size) => `${size}×${size}`).join(', ')})`,
  );
} finally {
  await browser.close();
}
