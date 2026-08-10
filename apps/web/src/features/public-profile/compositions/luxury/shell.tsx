'use client';

import type { ProfileShellProps } from '../../contracts/sections';
import { OrgHeader } from './org-header';
import { OrgNav } from './org-nav';

/**
 * Каркас мира Luxury («Bergs», грейж-разворот): журнальный лист на холсте.
 * Одна колонка 480px цвета листа (`--bg`) лежит на более тёмном холсте
 * (`--bg-sunken`); на широких экранах края листа несут чернильные швы —
 * страница читается как разворот, положенный на стол. Никаких теней и
 * скруглений: границы рисуют волосяные линейки.
 *
 * Приход страницы — штора: поле цвета `--bg` поднимается за 640ms и
 * открывает страницу, один раз за визит (layout переживает клиентские
 * переходы внутри сегмента). Закон А5 снимает её мгновенно для посетителей
 * с reduced-motion.
 */
export function Shell({ org, children }: ProfileShellProps) {
  return (
    <>
      <div
        aria-hidden="true"
        className="anim-luxury-curtain pointer-events-none fixed inset-0 z-[60] bg-bg"
      />

      <div className="min-h-[100dvh] bg-bg-sunken">
        <div className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col border-border-strong bg-bg sm:border-x">
          <OrgHeader org={org} />
          <OrgNav org={org} />
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </>
  );
}
