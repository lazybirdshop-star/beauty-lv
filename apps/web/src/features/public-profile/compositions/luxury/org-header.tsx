'use client';

import type { HeaderProps } from '../../contracts/sections';
import { HeroFrameMedia, heroFrameUrl } from '../../shared/hero-media';

/**
 * Hero мира Luxury («Bergs»): шапка-колонтитул и полоса-разворот.
 *
 * Колонтитул: имя-вордмарка Cormorant 19px капсом с разрядкой 0.08em слева,
 * город капсом 10px с разрядкой 0.22em справа; снизу — чернильный шов.
 *
 * Разворот — сетка [64px | 1fr] с чернильными швами: в левой колонке имя
 * стоит вертикально (writing-mode, Cormorant 34px капсом), правая несёт
 * портрет в тихой линейке (3:4) и подпись-манифест капсом 11px с разрядкой
 * 0.2em. С lg полоса раскрывается: портрет занимает левую страницу
 * разворота за чернильным средником, манифест дышит на правой, прижатый к
 * нижнему краю, — асимметрия журнального листа. Первый кадр — церемония:
 * портрет поднимается из рамки маской за 700ms и оседает scale(1.12) → 1
 * за 900ms, вертикальное имя — fade с подъёмом за 600ms.
 */
export function OrgHeader({ org }: HeaderProps) {
  /* Портрет полосы: обложка мастера; когда её нет — фото профиля, если
     мастер разрешила его показывать. Плейсхолдеров нет: без фото полоса
     остаётся типографской. */
  const portraitUrl = heroFrameUrl(org.design);

  return (
    <header data-studio-zone="heroPhoto">
      <h1 className="sr-only">{org.name}</h1>

      {/* Колонтитул листа. */}
      <div className="flex items-center justify-between gap-3 border-b border-border-strong px-[18px] py-4 lg:px-8 lg:py-5">
        <span
          aria-hidden="true"
          className="min-w-0 truncate font-display text-[19px] uppercase leading-none tracking-[0.08em] [font-weight:var(--display-weight)] text-ink lg:text-[22px]"
        >
          {org.name}
        </span>
        {org.city ? (
          <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.22em] text-ink-faint">
            {org.city}
          </span>
        ) : null}
      </div>

      {/* Полоса-разворот: вертикальное имя + портрет + манифест. */}
      <div className="grid grid-cols-[64px_1fr] border-b border-border-strong lg:grid-cols-[72px_1fr]">
        <div className="flex items-end justify-center overflow-hidden border-r border-border-strong py-5 lg:py-6">
          <span
            aria-hidden="true"
            className="anim-luxury-rise rotate-180 whitespace-nowrap font-display text-[34px] uppercase leading-none tracking-[0.06em] [font-weight:var(--display-weight)] [writing-mode:vertical-rl] text-ink lg:text-[44px]"
          >
            {org.name}
          </span>
        </div>

        <div className="min-w-0 lg:flex lg:items-stretch">
          {portraitUrl ? (
            /* Левая страница разворота: на lg портрет несёт собственную
               ячейку с чернильным средником справа. */
            <div className="lg:w-[44%] lg:shrink-0 lg:border-r lg:border-border-strong lg:p-6">
              {/* Рама — маска: образ поднимается из кадра за 700ms, камера
                 оседает за 900ms. Рамка — тихая линейка `--border`. */}
              <div className="mx-[18px] mt-[18px] overflow-hidden border border-border lg:m-0">
                <div className="anim-luxury-reveal">
                  <HeroFrameMedia
                    design={org.design}
                    className="aspect-[3/4] w-full"
                    imageClassName="anim-luxury-settle"
                  />
                </div>
              </div>
            </div>
          ) : null}

          {org.tagline ? (
            /* Правая страница: манифест прижат к нижнему краю — воздух
               сверху и есть роскошь листа. */
            <div className="lg:flex lg:min-w-0 lg:flex-1 lg:flex-col lg:justify-end">
              <p className="px-[18px] pb-[22px] pt-[18px] text-[11px] font-medium uppercase leading-[1.9] tracking-[0.2em] text-ink-soft lg:max-w-[44ch] lg:px-6 lg:pb-6 lg:text-[12px] lg:tracking-[0.22em]">
                {org.tagline}
              </p>
            </div>
          ) : (
            /* Без манифеста полоса всё равно дышит: воздух под портретом
               или под вертикальным именем. */
            <div aria-hidden="true" className="pb-[22px] lg:flex-1 lg:pb-0" />
          )}
        </div>
      </div>
    </header>
  );
}
