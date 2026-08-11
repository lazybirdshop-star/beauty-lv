import { contrastRatio, parseHexColor, relativeLuminance } from './theme.js';

/**
 * Цветовая математика Студии (DESIGN_STUDIO.md §2.2).
 *
 * Здесь живёт ровно одна идея: **непроходящей пары не существует**. Студия
 * не предупреждает мастера о плохом контрасте и не блокирует выбор — она
 * сохраняет тон и насыщенность решения и доводит светлоту до ближайшей
 * ступени, которая проходит норму. Поэтому все функции модуля возвращают
 * цвет, а не вердикт: вердикт перекладывает работу на мастера.
 *
 * Модуль намеренно не знает ни о пресетах, ни о ручках — только о цвете.
 * Каталоги и решения лежат в `page-design.ts`, замеры — в `theme.ts`.
 */

export interface Hsl {
  /** 0–360 */
  h: number;
  /** 0–100 */
  s: number;
  /** 0–100 */
  l: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toHexChannel(value: number): string {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0').toUpperCase();
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${toHexChannel(r)}${toHexChannel(g)}${toHexChannel(b)}`;
}

/** `null` для неразбираемого входа — как и в замерах, число не выдумывается. */
export function hexToHsl(hex: string): Hsl | null {
  const rgb = parseHexColor(hex);
  if (!rgb) return null;

  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const l = (max + min) / 2;

  if (delta === 0) return { h: 0, s: 0, l: l * 100 };

  const s = delta / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / delta) % 6;
  else if (max === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;

  return { h: (h * 60 + 360) % 360, s: s * 100, l: l * 100 };
}

export function hslToHex({ h, s, l }: Hsl): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 100) / 100;
  const light = clamp(l, 0, 100) / 100;

  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;

  const [r, g, b] =
    hue < 60
      ? [c, x, 0]
      : hue < 120
        ? [x, c, 0]
        : hue < 180
          ? [0, c, x]
          : hue < 240
            ? [0, x, c]
            : hue < 300
              ? [x, 0, c]
              : [c, 0, x];

  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

/** Светлая земля или тёмная — направление автокоррекции зависит только от этого. */
export function isLightColor(hex: string): boolean {
  const luminance = relativeLuminance(hex);
  return luminance !== null && luminance > 0.18;
}

/**
 * Смешение двух цветов в sRGB. Тем же приёмом страница строит мягкую
 * подложку акцента: не альфа-канал, а вычисленный непрозрачный цвет —
 * подложка обязана выглядеть одинаково над любым слоем.
 */
export function mixColors(a: string, b: string, weightOfA: number): string {
  const first = parseHexColor(a);
  const second = parseHexColor(b);
  if (!first || !second) return a;
  const w = clamp(weightOfA, 0, 1);
  return rgbToHex(
    first.r * w + second.r * (1 - w),
    first.g * w + second.g * (1 - w),
    first.b * w + second.b * (1 - w),
  );
}

/** Шаг светлоты автокоррекции: мельче — незаметно глазу, крупнее — заметный скачок тона. */
const LIGHTNESS_STEP = 1.5;

/**
 * Ближайшая по светлоте версия цвета, проходящая норму против земли.
 *
 * Тон и насыщенность — решение мастера и не трогаются никогда: меняется
 * только светлота, и только в ту сторону, где норма достижима (от светлой
 * земли — вниз, от тёмной — вверх). Если норма недостижима вовсе (земля
 * ровно посередине шкалы), возвращается предельная ступень: результат всё
 * равно лучший из возможных, а не отказ.
 */
export function correctLightnessForContrast(
  hex: string,
  ground: string,
  minimumRatio: number,
): string {
  const hsl = hexToHsl(hex);
  if (!hsl || !parseHexColor(ground)) return hex;

  const current = contrastRatio(hex, ground);
  if (current !== null && current >= minimumRatio) return hex;

  const direction = isLightColor(ground) ? -1 : 1;
  let best = hex;
  let bestRatio = current ?? 0;

  for (let step = 1; step * LIGHTNESS_STEP <= 100; step += 1) {
    const candidate = hslToHex({
      ...hsl,
      l: clamp(hsl.l + direction * step * LIGHTNESS_STEP, 0, 100),
    });
    const ratio = contrastRatio(candidate, ground);
    if (ratio === null) break;
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = candidate;
    }
    if (ratio >= minimumRatio) return candidate;
    /* Дошли до края шкалы — дальше ступеней нет. */
    const light = hsl.l + direction * step * LIGHTNESS_STEP;
    if (light <= 0 || light >= 100) break;
  }

  return best;
}

/**
 * Сдвиг светлоты на заданное число ступеней — материал рампы фона (§5.5).
 * Насыщенность и тон сохраняются: рампа обязана остаться землёй **этого**
 * мира, а не набором посторонних оттенков.
 */
export function shiftLightness(hex: string, steps: number): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return hex;
  return hslToHex({ ...hsl, l: clamp(hsl.l + steps, 0, 100) });
}
