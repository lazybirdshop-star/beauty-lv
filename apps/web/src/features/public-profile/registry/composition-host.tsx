import { resolveDesign } from '@amolie/shared-kernel';
import type { ReactNode } from 'react';

import { AmbientBackdrop } from '@/components/ui/ambient-backdrop';

import type { PublicOrganization } from '../engine/types';
import { ThemeStyle } from '../shared/theme-style';

import { resolveBrandStyleKey } from './brand-style';
import { CompositionRoot } from './brand-style-registry';
import { ShellHost } from './shell-host';

/**
 * Полная сборка страницы мастера: токены мира, фон, композиция, каркас.
 *
 * Единственное место, где мир собирается целиком, и ровно поэтому оно
 * существует. У сборки два вызывающих — публичный layout и холст Студии
 * (DESIGN_STUDIO.md §4.1, «предпросмотр — это сама страница»), — и общий
 * компонент делает совпадение предпросмотра со страницей свойством
 * конструкции, а не дисциплины: разойтись им негде, второй сборки нет.
 *
 * Серверный компонент: `ThemeStyle` обязан приехать в первом кадре, иначе
 * страница моргнёт продуктовой палитрой перед палитрой мастера.
 */
export function CompositionHost({
  org,
  children,
}: {
  org: PublicOrganization;
  children: ReactNode;
}) {
  /*
   * The route layer no longer knows how the worlds are arranged: the key
   * resolves to a composition (BRAND_STYLE_ARCHITECTURE.md §8) and the
   * world's own `Shell` lays out the hero, the panel and the pages. What
   * stays here is world-agnostic infrastructure — token emission and the
   * page background.
   */
  const design = resolveDesign(org.designPresetKey);

  const background = org.backgroundImageUrl ? (
    <div aria-hidden="true" className="fixed inset-0 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={org.backgroundImageUrl} alt="" className="h-full w-full object-cover" />
      {/* Scrim over a master's own background photo. Readability does not rest
          on it — every block above carries its own ground — so it only has to
          keep the palette present, not hide the picture. */}
      <div className="absolute inset-0 bg-bg/45" />
    </div>
  ) : /* Ambient light exists so frosted panes have something to frost. A
      world without glass (blur 0 — Editorial, Minimal, Luxury, Organic,
      poster) gets none: emptiness is the material there, not a missing
      decoration. */
  design.surfaces.blur !== '0px' ? (
    /* Fixed so the frosted panels have real colour to blur against. */
    <AmbientBackdrop className="fixed" />
  ) : null;

  return (
    <div className="relative min-h-[100dvh] bg-bg">
      <ThemeStyle
        designPresetKey={org.designPresetKey}
        themePresetKey={org.themePresetKey}
        fontPresetKey={org.fontPresetKey}
        themeOverrides={org.themeOverrides}
      />

      {background}

      <CompositionRoot styleKey={resolveBrandStyleKey(org.designPresetKey)}>
        <ShellHost org={org}>{children}</ShellHost>
      </CompositionRoot>
    </div>
  );
}
