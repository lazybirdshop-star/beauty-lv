import type { PageDesign } from '@amolie/shared-kernel';

/**
 * Протокол Студии и холста (DESIGN_STUDIO.md §4.2).
 *
 * Холст — отдельный документ во фрейме, потому что страница пишет токены в
 * `:root`, а кабинет держит там свою тему; двум темам один документ не
 * поделить. Из этого следует, что общаться им нечем, кроме сообщений, —
 * и **весь** их словарь описан здесь, в одном файле на обе стороны. Второй
 * словарь означал бы протокол, который расходится сам с собой.
 *
 * Наружу из предпросмотра не поднимается ничего, кроме готовности и
 * нажатой зоны: публичная страница о существовании Студии не знает.
 */

/** Зоны страницы, по которым можно попасть в секцию инспектора (§3.3). */
export const STUDIO_ZONES = ['heroPhoto', 'cards', 'buttons', 'background'] as const;
export type StudioZone = (typeof STUDIO_ZONES)[number];

/** Контексты предпросмотра (§4.4): каждый экран, который получит клиент. */
export const PREVIEW_CONTEXTS = ['page', 'booking', 'status'] as const;
export type PreviewContext = (typeof PREVIEW_CONTEXTS)[number];

/** Эмуляция системных настроек посетителя (§4.4, А5–А6). */
export interface PreviewEmulation {
  reducedMotion: boolean;
  reducedTransparency: boolean;
}

export type StudioToPreview =
  | { channel: 'amolie-studio'; type: 'design'; design: PageDesign }
  | { channel: 'amolie-studio'; type: 'context'; context: PreviewContext }
  | { channel: 'amolie-studio'; type: 'emulate'; emulation: PreviewEmulation };

export type PreviewToStudio =
  | { channel: 'amolie-studio'; type: 'ready' }
  | { channel: 'amolie-studio'; type: 'zone'; zone: StudioZone };

export const STUDIO_CHANNEL = 'amolie-studio';

/** Сообщение своё, а не чужое: фрейм слушает окно, в которое пишут все. */
export function isStudioMessage<T extends { channel: string }>(data: unknown): data is T {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { channel?: unknown }).channel === STUDIO_CHANNEL
  );
}

/** Атрибут зоны на разметке мира — единственное, что миры знают о Студии. */
export const ZONE_ATTRIBUTE = 'data-studio-zone';

export function zoneOfElement(target: EventTarget | null): StudioZone | null {
  if (!(target instanceof Element)) return null;
  const holder = target.closest(`[${ZONE_ATTRIBUTE}]`);
  const value = holder?.getAttribute(ZONE_ATTRIBUTE);
  return (STUDIO_ZONES as readonly string[]).includes(value ?? '') ? (value as StudioZone) : null;
}
