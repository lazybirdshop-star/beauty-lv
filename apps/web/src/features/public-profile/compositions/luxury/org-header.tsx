'use client';

import type { HeaderProps } from '../../contracts/sections';

/**
 * Hero мира Luxury («Bergs»): шапка-колонтитул и полоса-разворот.
 *
 * Колонтитул: имя-вордмарка Cormorant 19px капсом с разрядкой 0.08em слева,
 * город капсом 10px с разрядкой 0.22em справа; снизу — чернильный шов.
 *
 * Разворот — сетка [64px | 1fr] с чернильными швами: в левой колонке имя
 * стоит вертикально (writing-mode, Cormorant 34px капсом), правая несёт
 * портрет в тихой линейке (3:4) и подпись-манифест капсом 11px с разрядкой
 * 0.2em. Первый кадр — церемония: портрет поднимается из рамки маской за
 * 700ms и оседает scale(1.12) → 1 за 900ms, вертикальное имя — fade с
 * подъёмом за 600ms.
 */
export function OrgHeader({ org }: HeaderProps) {
  /* Портрет полосы: обложка мастера; когда её нет — фото профиля, если
     мастер разрешила его показывать. Плейсхолдеров нет: без фото полоса
     остаётся типографской. */
  const portraitUrl =
    (org.heroStyle === 'image' ? org.coverUrl : undefined) ??
    (org.showAvatar ? org.logoUrl : undefined);

  return (
    <header>
      <h1 className="sr-only">{org.name}</h1>

      {/* Колонтитул листа. */}
      <div className="flex items-center justify-between gap-3 border-b border-border-strong px-[18px] py-4">
        <span
          aria-hidden="true"
          className="min-w-0 truncate font-display text-[19px] uppercase leading-none tracking-[0.08em] [font-weight:var(--display-weight)] text-ink"
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
      <div className="grid grid-cols-[64px_1fr] border-b border-border-strong">
        <div className="flex items-end justify-center overflow-hidden border-r border-border-strong py-5">
          <span
            aria-hidden="true"
            className="anim-luxury-rise rotate-180 whitespace-nowrap font-display text-[34px] uppercase leading-none tracking-[0.06em] [font-weight:var(--display-weight)] [writing-mode:vertical-rl] text-ink"
          >
            {org.name}
          </span>
        </div>

        <div className="min-w-0">
          {portraitUrl ? (
            /* Рама — маска: образ поднимается из кадра за 700ms, камера
               оседает за 900ms. Рамка — тихая линейка `--border`. */
            <div className="mx-[18px] mt-[18px] overflow-hidden border border-border">
              <div className="anim-luxury-reveal">
                {/* Masters paste an arbitrary photo URL, so this stays a plain
                    <img> rather than opening next/image's optimizer to any host. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={portraitUrl}
                  alt=""
                  className="anim-luxury-settle aspect-[3/4] w-full object-cover"
                />
              </div>
            </div>
          ) : null}

          {org.tagline ? (
            <p className="px-[18px] pb-[22px] pt-[18px] text-[11px] font-medium uppercase leading-[1.9] tracking-[0.2em] text-ink-soft">
              {org.tagline}
            </p>
          ) : (
            /* Без манифеста полоса всё равно дышит: воздух под портретом
               или под вертикальным именем. */
            <div aria-hidden="true" className="pb-[22px]" />
          )}
        </div>
      </div>
    </header>
  );
}
