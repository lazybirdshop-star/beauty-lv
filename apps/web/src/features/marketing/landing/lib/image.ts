/* Адрес картинки через оптимизатор Next.
   `next/image` пишет такие адреса сам, но на стекло устройства снимок кладёт
   не разметка, а WebGL: три-джей грузит его `TextureLoader`-ом и про JSX
   ничего не знает. Адрес тот же самый, поэтому и снимки интерфейса приезжают
   в AVIF/WebP и ровно того размера, который нужен текстуре, — 240 КБ JPEG
   превращаются в 24 КБ и перестают мылиться на стекле. */

/**
 * Ширины, которые принимает оптимизатор: `imageSizes` + `deviceSizes` из
 * настроек по умолчанию (next.config.ts их не переопределяет). Любая другая
 * ширина — 400 от `/_next/image`, поэтому запрошенное всегда округляется
 * вверх до ближайшей из этих.
 */
const WIDTHS = [
  16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840,
] as const;

/** Разрешённые значения качества — они же объявлены в next.config.ts. */
export type Quality = 75 | 82;

/**
 * @param src   путь к исходнику в /public
 * @param width сколько пикселей ширины нужно на самом деле
 */
export function optimizedSrc(src: string, width: number, quality: Quality = 75): string {
  const w = WIDTHS.find((candidate) => candidate >= width) ?? WIDTHS[WIDTHS.length - 1]!;
  return `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=${quality}`;
}
