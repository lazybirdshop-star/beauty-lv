import { resolvePageDesignTokens } from '@amolie/shared-kernel';
import Image from 'next/image';
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
  /* Разрешённые значения, а не значения пресета: материал поверхностей —
     ручка (§5.8), и мир без стекла по решению мастера не должен получать
     амбайент, которому нечего подсвечивать. */
  const resolved = resolvePageDesignTokens(org.design);

  const background =
    org.design.background.kind === 'image' ? (
      <div aria-hidden="true" className="fixed inset-0 overflow-hidden">
        <Image
          src={org.design.background.url}
          alt=""
          /* Фон занимает весь экран, и его размеры знает не разметка, а окно:
             `fill` вместо ширины с высотой, `100vw` — вместо догадки. */
          fill
          sizes="100vw"
          /* Это LCP-элемент страницы: он обязан начать грузиться в первом
             кадре, а не после того, как браузер разберёт остальную разметку. */
          priority
          /* Точка кадрирования — решение мастера (§5.5), общий механизм всех
             медиа-ручек: токен ставит резолвер, разметка его только читает. */
          className="object-cover [object-position:var(--page-bg-focal)]"
        />
        {/* Scrim over a master's own background photo. Readability does not rest
          on it — every block above carries its own ground — so it only has to
          keep the palette present, not hide the picture. */}
        <div className="absolute inset-0 bg-bg/45" />
      </div>
    ) : /* Ambient light exists so frosted panes have something to frost. A
      world without glass (blur 0 — Luxury, poster, FUNK) gets none:
      emptiness is the material there, not a missing decoration. */
    resolved.surfaces.blur !== '0px' ? (
      /* Fixed so the frosted panels have real colour to blur against. */
      <AmbientBackdrop className="fixed" />
    ) : null;

  return (
    <div className="relative min-h-[100dvh] bg-bg">
      <ThemeStyle design={org.design} />

      {background}

      <CompositionRoot styleKey={resolveBrandStyleKey(org.design.style)}>
        <ShellHost org={org}>{children}</ShellHost>
      </CompositionRoot>
    </div>
  );
}
